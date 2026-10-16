import { inject, injectable } from 'inversify'
import { AppError } from '@/common/errors/AppError'
import type {
  IRestoreListCheck,
  RestoreRefusal,
} from '@/common/options/RestoreListCheck'
import { getRandomUUID } from '@/common/utils/utils'
import {
  BUILTIN_SOURCES,
  createBuiltinConfig,
  findBuiltinSource,
  withoutLockedValues,
} from './builtin'
import {
  ConfigSchemaSourceSymbol,
  type IConfigSchemaSource,
  type IProviderConfigCleanup,
  type ManifestAvailability,
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
  MAX_NAME_LENGTH,
  type ProviderConfigIssue,
} from './validation'

const draftSchema = providerConfigSchema.omit({ id: true })

const editSchema = providerConfigSchema
  .pick({ customName: true, configValues: true })
  .partial()
  .strict()

function touchedBy(edit: ProviderConfigEdit, issue: ProviderConfigIssue) {
  if (issue.kind === 'config') {
    return 'configValues' in edit
  }
  return 'customName' in edit
}

function notFound(id: string): AppError {
  return new AppError(
    'config.notFound',
    { id },
    { message: `Source "${id}" not found, it might have been deleted.` }
  )
}

// A source's settings can only be checked, and so only be set, once its
// manifest loads here.
function unusableSource(
  manifestId: string,
  availability: Extract<ManifestAvailability, { status: 'unavailable' }>
): AppError {
  return new AppError(
    'manifest.unavailable',
    { manifestId, reason: availability.reason },
    { message: `Source "${manifestId}" is unavailable: ${availability.reason}` }
  )
}

function sameJson(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameJson(item, b[i]))
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a)
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => key in b && sameJson(a[key], b[key]))
    )
  }
  return Object.is(a, b)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function configSchemaOf(availability: ManifestAvailability) {
  return availability.status === 'ok' ? availability.configSchema : undefined
}

function throwIfInvalid(issues: ProviderConfigIssue[]): void {
  if (issues.length === 0) {
    return
  }
  const message = `Invalid source settings: ${issues.map(describeIssue).join('; ')}`
  const found = configIssues(issues)
  if (found.length > 0) {
    throw new AppError('config.invalid', { issues: found }, { message })
  }
  if (issues.some((issue) => issue.kind === 'nameTooLong')) {
    throw new AppError(
      'config.nameTooLong',
      { max: MAX_NAME_LENGTH },
      { message }
    )
  }
  throw new AppError('config.nameRequired', {}, { message })
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
    const availability = await this.availability(config.manifestId)
    if (availability.status !== 'ok') {
      throw unusableSource(config.manifestId, availability)
    }
    throwIfInvalid(
      checkProviderConfig({ config, configSchema: availability.configSchema })
    )
    await this.options.transform((configs) => [...configs, config])
    return config
  }

  async addBuiltin(manifestId: string): Promise<ProviderConfig> {
    const source = findBuiltinSource(manifestId)
    if (!source) {
      throw new AppError(
        'config.notBuiltin',
        { manifestId },
        { message: `"${manifestId}" has no built-in source` }
      )
    }
    const config = createBuiltinConfig(source)
    await this.options.transform((configs) => {
      if (configs.some((item) => item.id === config.id)) {
        throw new AppError(
          'config.duplicate',
          { manifestId },
          { message: `The built-in "${manifestId}" source already exists` }
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
      const availability = await this.availability(current.manifestId)
      const next = withoutLockedValues({ ...current, ...edit })
      // The editor always sends the settings, so only a change to them needs
      // a manifest to check against.
      if (
        availability.status !== 'ok' &&
        !sameJson(next.configValues, current.configValues)
      ) {
        throw unusableSource(current.manifestId, availability)
      }
      const issues = checkProviderConfig({
        config: next,
        configSchema: configSchemaOf(availability),
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
        throw new AppError(
          'config.orderMismatch',
          {},
          { message: 'The new order must list every source exactly once' }
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
  // whose manifest is not installed, needs a newer extension, does not load
  // or runs on the bundled fallback stays, since there is no configSchema
  // its settings were written for to check them against, and dropping it
  // would lose them. Ids key seasons and every write, so of several sources
  // with one id the first that is otherwise valid is restored and the others
  // are refused.
  async check(entries: unknown[]): Promise<(RestoreRefusal | undefined)[]> {
    const seen = new Set<string>()
    const reasons: (RestoreRefusal | undefined)[] = []
    for (const entry of entries) {
      const result = await this.checkEntry(entry)
      if (!result.ok) {
        reasons.push(result.refusal)
      } else if (seen.has(result.id)) {
        reasons.push({
          reason: 'duplicateId',
          detail: `Another source in the backup has the id "${result.id}"; the first one was restored`,
        })
      } else {
        seen.add(result.id)
        reasons.push(undefined)
      }
    }
    return reasons
  }

  private async checkEntry(
    entry: unknown
  ): Promise<
    { ok: true; id: string } | { ok: false; refusal: RestoreRefusal }
  > {
    const parsed = providerConfigSchema.safeParse(entry)
    if (!parsed.success) {
      return {
        ok: false,
        refusal: { reason: 'invalidEntry', detail: 'Not a source config' },
      }
    }
    const availability = await this.availability(parsed.data.manifestId)
    // Older versions saved names of any length, so a long one is kept.
    const issues = checkProviderConfig({
      config: parsed.data,
      configSchema:
        availability.status === 'ok' && !availability.fallback
          ? availability.configSchema
          : undefined,
    }).filter((issue) => issue.kind !== 'nameTooLong')
    if (issues.length > 0) {
      const settings = issues.some((issue) => issue.kind === 'config')
      return {
        ok: false,
        refusal: {
          reason: settings ? 'invalidSettings' : 'nameRequired',
          detail: issues.map(describeIssue).join('; '),
        },
      }
    }
    return { ok: true, id: parsed.data.id }
  }

  private async availability(
    manifestId: string
  ): Promise<ManifestAvailability> {
    if (isLegacyMacCms({ manifestId })) {
      return {
        status: 'ok',
        configSchema: LEGACY_MACCMS_CONFIG_SCHEMA,
        fallback: false,
      }
    }
    return this.configSchemaSource.find(manifestId)
  }
}
