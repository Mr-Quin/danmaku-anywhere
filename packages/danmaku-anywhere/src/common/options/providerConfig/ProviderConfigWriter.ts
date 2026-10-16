import type { ConfigSchema } from '@mr-quin/dango'
import { inject, injectable } from 'inversify'
import type { IRestoreListCheck } from '@/common/options/RestoreListCheck'
import { getRandomUUID } from '@/common/utils/utils'
import {
  BUILTIN_SOURCES,
  createBuiltinConfig,
  findBuiltinSource,
  withoutLockedValues,
} from './builtin'
import { ProviderConfigError } from './ProviderConfigError'
import {
  ConfigSchemaSourceSymbol,
  type IConfigSchemaSource,
  type IProviderConfigCleanup,
  ProviderConfigCleanupSymbol,
} from './ports'
import {
  type ProviderConfig,
  type ProviderConfigDraft,
  type ProviderConfigEdit,
  providerConfigSchema,
} from './schema'
import { ProviderConfigService } from './service'
import { isLegacyMacCms } from './utils'
import {
  checkProviderConfig,
  configIssues,
  describeIssue,
  LEGACY_MACCMS_CONFIG_SCHEMA,
  type ProviderConfigIssue,
} from './validation'

const draftSchema = providerConfigSchema.omit({ id: true })

const editSchema = providerConfigSchema
  .pick({ customName: true, configValues: true })
  .partial()
  .strict()

function touchedBy(edit: ProviderConfigEdit, issue: ProviderConfigIssue) {
  if (issue.kind === 'nameRequired') {
    return 'customName' in edit
  }
  return 'configValues' in edit
}

function notFound(id: string): ProviderConfigError {
  return new ProviderConfigError(
    { code: 'config.notFound', params: { id } },
    `Source "${id}" not found, it might have been deleted.`
  )
}

function unknownSource(manifestId: string): ProviderConfigError {
  return new ProviderConfigError(
    { code: 'config.unknownSource', params: { manifestId } },
    `No source "${manifestId}" is installed`
  )
}

function throwIfInvalid(issues: ProviderConfigIssue[]): void {
  if (issues.length === 0) {
    return
  }
  const message = `Invalid source settings: ${issues.map(describeIssue).join('; ')}`
  const found = configIssues(issues)
  if (found.length === 0) {
    throw new ProviderConfigError(
      { code: 'config.nameRequired', params: {} },
      message
    )
  }
  throw new ProviderConfigError(
    { code: 'config.invalid', params: { issues: found } },
    message
  )
}

// The one writer of provider configs. Each operation reads, checks and writes
// the whole list as one step of the store's write queue, which restore shares,
// so a write can never be based on a list another write has since replaced.
@injectable('Singleton')
export class ProviderConfigWriter implements IRestoreListCheck {
  readonly store = 'providerConfig'

  constructor(
    @inject(ProviderConfigService)
    private readonly providerConfigService: ProviderConfigService,
    @inject(ConfigSchemaSourceSymbol)
    private readonly configSchemaSource: IConfigSchemaSource,
    @inject(ProviderConfigCleanupSymbol)
    private readonly cleanup: IProviderConfigCleanup
  ) {}

  private get options() {
    return this.providerConfigService.options
  }

  async create(input: ProviderConfigDraft): Promise<ProviderConfig> {
    const draft = draftSchema.parse(input)
    const config: ProviderConfig = { ...draft, id: getRandomUUID() }
    const known = await this.findConfigSchema(config.manifestId)
    if (!known) {
      throw unknownSource(config.manifestId)
    }
    throwIfInvalid(checkProviderConfig({ config, ...known }))
    await this.options.transform((configs) => [...configs, config])
    return config
  }

  async addBuiltin(manifestId: string): Promise<ProviderConfig> {
    const source = findBuiltinSource(manifestId)
    if (!source) {
      throw new ProviderConfigError(
        { code: 'config.notBuiltin', params: { manifestId } },
        `"${manifestId}" has no built-in source`
      )
    }
    const config = createBuiltinConfig(source)
    await this.options.transform((configs) => {
      if (configs.some((item) => item.id === config.id)) {
        throw new ProviderConfigError(
          { code: 'config.duplicate', params: { manifestId } },
          `The built-in "${manifestId}" source already exists`
        )
      }
      return [...configs, config]
    })
    return config
  }

  // Settings the extension owns on a built-in are dropped, not refused. A
  // source whose manifest is not installed can still be renamed, but its
  // settings cannot be checked, so they stay as they are.
  async update(id: string, input: ProviderConfigEdit): Promise<ProviderConfig> {
    const edit = editSchema.parse(input)
    let updated: ProviderConfig | undefined
    await this.options.transform(async (configs) => {
      const current = configs.find((item) => item.id === id)
      if (!current) {
        throw notFound(id)
      }
      const known = await this.findConfigSchema(current.manifestId)
      if (!known && 'configValues' in edit) {
        throw unknownSource(current.manifestId)
      }
      const next = withoutLockedValues({ ...current, ...edit })
      const issues = checkProviderConfig({
        config: next,
        configSchema: known?.configSchema,
      })
      throwIfInvalid(issues.filter((issue) => touchedBy(edit, issue)))
      updated = next
      return configs.map((item) => (item.id === id ? next : item))
    })
    if (!updated) {
      throw notFound(id)
    }
    return updated
  }

  async setEnabled(id: string, enabled: boolean): Promise<ProviderConfig> {
    let updated: ProviderConfig | undefined
    await this.options.transform((configs) => {
      const current = configs.find((item) => item.id === id)
      if (!current) {
        throw notFound(id)
      }
      const next = { ...current, enabled }
      updated = next
      return configs.map((item) => (item.id === id ? next : item))
    })
    if (!updated) {
      throw notFound(id)
    }
    return updated
  }

  async setOrder(ids: string[]): Promise<void> {
    await this.options.transform((configs) => {
      const byId = new Map(configs.map((config) => [config.id, config]))
      const ordered = ids.flatMap((id) => {
        const config = byId.get(id)
        return config ? [config] : []
      })
      if (
        ids.length !== configs.length ||
        ordered.length !== configs.length ||
        new Set(ids).size !== configs.length
      ) {
        throw new ProviderConfigError(
          { code: 'config.orderMismatch', params: {} },
          'The new order must list every source exactly once'
        )
      }
      return ordered
    })
  }

  // The cleanup runs inside the write step, so a failed write leaves the
  // config in place for a retry that cleans up again.
  async delete(id: string): Promise<void> {
    await this.options.transform(async (configs) => {
      if (!configs.some((item) => item.id === id)) {
        throw notFound(id)
      }
      await this.cleanup.beforeDelete(id)
      return configs.filter((item) => item.id !== id)
    })
  }

  async deleteByManifest(manifestId: string): Promise<void> {
    await this.options.transform(async (configs) => {
      const removed = configs.filter((item) => item.manifestId === manifestId)
      if (removed.length === 0) {
        return configs
      }
      for (const config of removed) {
        await this.cleanup.beforeDelete(config.id)
      }
      return configs.filter((item) => item.manifestId !== manifestId)
    })
  }

  // Writes the built-ins only into an empty list, returning whether it did.
  async seedBuiltins(): Promise<boolean> {
    let seeded = false
    await this.options.transform((configs) => {
      if (configs.length > 0) {
        return configs
      }
      seeded = true
      return BUILTIN_SOURCES.map(createBuiltinConfig)
    })
    return seeded
  }

  // Restore runs entries through the store's backupItemSchema first. A source
  // whose manifest is not installed stays and shows as unavailable. Ids key
  // seasons and every write, so of several sources with one id the first that
  // is otherwise valid is restored and the others are refused.
  async check(entries: unknown[]): Promise<(string | undefined)[]> {
    const seen = new Set<string>()
    const reasons: (string | undefined)[] = []
    for (const entry of entries) {
      const result = await this.checkEntry(entry)
      if (!result.ok) {
        reasons.push(result.reason)
      } else if (seen.has(result.id)) {
        reasons.push(
          `Another source in the backup has the id "${result.id}"; the first one was restored`
        )
      } else {
        seen.add(result.id)
        reasons.push(undefined)
      }
    }
    return reasons
  }

  private async checkEntry(
    entry: unknown
  ): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
    const parsed = providerConfigSchema.safeParse(entry)
    if (!parsed.success) {
      return { ok: false, reason: 'Not a source config' }
    }
    const known = await this.findConfigSchema(parsed.data.manifestId)
    const issues = checkProviderConfig({
      config: parsed.data,
      configSchema: known?.configSchema,
    })
    if (issues.length > 0) {
      return { ok: false, reason: issues.map(describeIssue).join('; ') }
    }
    return { ok: true, id: parsed.data.id }
  }

  // Undefined when the manifest is not installed
  private async findConfigSchema(
    manifestId: string
  ): Promise<{ configSchema: ConfigSchema | undefined } | undefined> {
    if (isLegacyMacCms({ manifestId })) {
      return { configSchema: LEGACY_MACCMS_CONFIG_SCHEMA }
    }
    return this.configSchemaSource.find(manifestId)
  }
}
