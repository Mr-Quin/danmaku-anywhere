import type { ConfigSchema } from '@mr-quin/dango'
import { inject, injectable, LazyServiceIdentifier } from 'inversify'
import { BookmarkService } from '@/background/services/persistence/BookmarkService'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  BUILTIN_SOURCES,
  createBuiltinConfig,
  findBuiltinSource,
} from '@/common/options/providerConfig/builtin'
import {
  type ProviderConfig,
  type ProviderConfigDraft,
  type ProviderConfigEdit,
  providerConfigSchema,
} from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { isLegacyMacCms } from '@/common/options/providerConfig/utils'
import {
  checkProviderConfig,
  describeIssue,
  LEGACY_MACCMS_CONFIG_SCHEMA,
  type ProviderConfigCheck,
  type ProviderConfigIssue,
} from '@/common/options/providerConfig/validation'
import { getRandomUUID } from '@/common/utils/utils'
import { ManifestRegistry } from './ManifestRegistry'

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

function notFound(id: string): Error {
  return new Error(`Source "${id}" not found, it might have been deleted.`)
}

// The one writer of provider configs. Each operation reads, checks and writes
// the whole list as one step of the store's write queue, which restore shares,
// so a write can never be based on a list another write has since replaced.
@injectable('Singleton')
export class ProviderConfigWriter implements IStoreService {
  readonly name = 'providerConfig'
  readonly backupItemSchema = providerConfigSchema.superRefine(
    async (config, ctx) => {
      for (const issue of await this.check({ next: config })) {
        ctx.addIssue({ code: 'custom', message: describeIssue(issue) })
      }
    }
  )

  constructor(
    @inject(ProviderConfigService)
    private readonly store: ProviderConfigService,
    // ManifestRegistry imports reach the background container module, which
    // binds this class, so the registry can still be undefined while this
    // module is decorated.
    @inject(new LazyServiceIdentifier(() => ManifestRegistry))
    private readonly manifestRegistry: ManifestRegistry,
    @inject(BookmarkService)
    private readonly bookmarkService: BookmarkService
  ) {}

  get options() {
    return this.store.options
  }

  async create(input: ProviderConfigDraft): Promise<ProviderConfig> {
    const draft = draftSchema.parse(input)
    const config: ProviderConfig = { ...draft, id: getRandomUUID() }
    await this.ensureValid({ next: config })
    await this.options.transform((configs) => [...configs, config])
    return config
  }

  async addBuiltin(manifestId: string): Promise<ProviderConfig> {
    const source = findBuiltinSource(manifestId)
    if (!source) {
      throw new Error(`"${manifestId}" has no built-in source`)
    }
    const config = createBuiltinConfig(source)
    await this.options.transform((configs) => {
      if (configs.some((item) => item.id === config.id)) {
        throw new Error(`The built-in "${manifestId}" source already exists`)
      }
      return [...configs, config]
    })
    return config
  }

  async update(id: string, input: ProviderConfigEdit): Promise<ProviderConfig> {
    const edit = editSchema.parse(input)
    let updated: ProviderConfig | undefined
    await this.options.transform(async (configs) => {
      const current = configs.find((item) => item.id === id)
      if (!current) {
        throw notFound(id)
      }
      const next = { ...current, ...edit }
      const issues = await this.check({ current, next })
      this.throwIfInvalid(issues.filter((issue) => touchedBy(edit, issue)))
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
        throw new Error('The new order must list every source exactly once')
      }
      return ordered
    })
  }

  // Bookmarks go first, so a retry after a failed config write still finds
  // the config and finishes the job.
  async delete(id: string): Promise<void> {
    await this.bookmarkService.deleteByProviderConfig(id)
    await this.options.transform((configs) => {
      if (!configs.some((item) => item.id === id)) {
        throw notFound(id)
      }
      return configs.filter((item) => item.id !== id)
    })
  }

  async deleteByManifest(manifestId: string): Promise<void> {
    const configs = await this.options.get()
    for (const config of configs) {
      if (config.manifestId === manifestId) {
        await this.delete(config.id)
      }
    }
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

  private async findConfigSchema(
    manifestId: string
  ): Promise<{ configSchema: ConfigSchema | undefined } | undefined> {
    if (isLegacyMacCms({ manifestId })) {
      return { configSchema: LEGACY_MACCMS_CONFIG_SCHEMA }
    }
    await this.manifestRegistry.ready
    try {
      const { manifest } = this.manifestRegistry.getRunner(manifestId)
      return { configSchema: manifest.configSchema }
    } catch {
      return undefined
    }
  }

  private async check(
    input: Omit<ProviderConfigCheck, 'configSchema'>
  ): Promise<ProviderConfigIssue[]> {
    const found = await this.findConfigSchema(input.next.manifestId)
    if (!found) {
      return [{ kind: 'unknownSource', manifestId: input.next.manifestId }]
    }
    return checkProviderConfig({ ...input, configSchema: found.configSchema })
  }

  private async ensureValid(
    input: Omit<ProviderConfigCheck, 'configSchema'>
  ): Promise<void> {
    this.throwIfInvalid(await this.check(input))
  }

  private throwIfInvalid(issues: ProviderConfigIssue[]): void {
    if (issues.length > 0) {
      throw new Error(
        `Invalid source settings: ${issues.map(describeIssue).join('; ')}`
      )
    }
  }
}
