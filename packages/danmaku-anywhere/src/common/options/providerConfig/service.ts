import { LEGACY_MACCMS_ID } from '@danmaku-anywhere/danmaku-converter'
import { produce } from 'immer'
import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { isServiceWorker } from '@/common/utils/utils'
import { defaultProviderConfigs } from './constant'
import {
  ensureBuiltinProviders,
  migrateBuiltinPrefixedProviderIds,
  migrateDanDanPlayApiBaseUrl,
  migrateProviderConfigsToFlat,
} from './migration'
import type { ProviderConfig } from './schema'
import { providerConfigSchema } from './schema'

@injectable('Singleton')
export class ProviderConfigService implements IStoreService {
  public readonly name = 'providerConfig'
  public readonly options: OptionsService<ProviderConfig[]>

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory<ProviderConfig[]>(
      'providerConfig',
      defaultProviderConfigs,
      this.logger
    )
      .version(2, {
        upgrade: (data) => {
          try {
            return ensureBuiltinProviders(migrateProviderConfigsToFlat(data))
          } catch (error) {
            console.error(
              '[providerConfig] migration failed, falling back to defaults:',
              error
            )
            return [...defaultProviderConfigs]
          }
        },
      })
      .version(3, {
        upgrade: (data) => {
          try {
            return migrateBuiltinPrefixedProviderIds(data)
          } catch (error) {
            console.error(
              '[providerConfig] builtin-prefix migration failed, falling back to defaults:',
              error
            )
            return [...defaultProviderConfigs]
          }
        },
      })
      .version(4, {
        upgrade: (data) => {
          try {
            return migrateDanDanPlayApiBaseUrl(data)
          } catch (error) {
            // A baseUrl tweak should never cost the user their configs, so
            // leave the data untouched rather than reset to defaults.
            console.error(
              '[providerConfig] DanDanPlay baseUrl migration failed, leaving configs unchanged:',
              error
            )
            return data
          }
        },
      })
  }
  async isIdUnique(id: string, excludeId?: string): Promise<boolean> {
    const configs = await this.options.get()
    return !configs.some((item) => item.id === id && item.id !== excludeId)
  }

  async create(input: unknown) {
    const config = await providerConfigSchema.parseAsync(input)

    const configs = await this.options.get()

    // Check if ID already exists
    const existingConfig = configs.find((item) => item.id === config.id)
    if (existingConfig) {
      throw new Error(`Provider with ID "${config.id}" already exists`)
    }

    await this.options.set([...configs, config])

    return config
  }

  async get(id: string): Promise<ProviderConfig | undefined> {
    const configs = await this.options.get()
    return configs.find((item) => item.id === id)
  }

  async mustGet(id: string): Promise<ProviderConfig> {
    const config = await this.get(id)
    if (!config) {
      throw new Error(
        `Provider config with ID "${id}" not found, it might have been deleted.`
      )
    }
    return config
  }

  async getAll() {
    return this.options.get()
  }

  /**
   * Returns the first automatic provider that is enabled
   */
  async getFirstAutomaticProvider(): Promise<ProviderConfig | undefined> {
    const automaticProviders = await this.getAutomaticProviders()
    return automaticProviders.find((item) => item.enabled)
  }

  async getAutomaticProviders(): Promise<ProviderConfig[]> {
    const configs = await this.options.get()

    return configs.filter(
      (item) => item.enabled && this.supportsAutomaticMode(item)
    )
  }

  supportsAutomaticMode(config: ProviderConfig): boolean {
    // Manifest-driven sources support automatic mode implicitly. Legacy MacCMS
    // has no manifest and is search-only, so it stays opt-out.
    return config.manifestId !== LEGACY_MACCMS_ID
  }

  async update<T extends ProviderConfig>(
    id: string,
    config: Partial<T>
  ): Promise<T> {
    const configs = await this.options.get()
    const prevConfig = configs.find((item) => item.id === id)

    if (!prevConfig) {
      throw new Error(`Provider with ID "${id}" not found.`)
    }

    const nextConfig = { ...prevConfig, ...config } as T

    if (config.id && config.id !== id) {
      throw new Error('Provider ID cannot be changed.')
    }

    const newConfigs = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === id)
      draft[index] = nextConfig
    })

    await this.options.set(newConfigs)

    return nextConfig
  }

  async delete(id: string) {
    // Deletion involves deleting seasons and episodes, which must be done in the background script
    // So this method just calls the background script to do the deletion
    await chromeRpcClient.providerConfigDelete(id)
  }

  async deleteFromStorage(id: string) {
    if (!isServiceWorker()) {
      throw new Error('Must called from background script.')
    }

    const configs = await this.options.get()
    const config = configs.find((item) => item.id === id)

    if (!config) {
      throw new Error(`Provider not found: "${id}" when deleting`)
    }

    const newData = produce(configs, (draft) => {
      const index = draft.findIndex((item) => item.id === id)
      draft.splice(index, 1)
    })

    await this.options.set(newData)
  }

  async toggle(id: string, enabled?: boolean) {
    const config = await this.get(id)

    if (!config) {
      throw new Error(`Provider not found: "${id}"`)
    }

    return this.update(id, {
      enabled: enabled ?? !config.enabled,
    })
  }

  async reorder(sourceIndex: number, destinationIndex: number) {
    const configs = await this.options.get()

    const newData = produce(configs, (draft) => {
      const [removed] = draft.splice(sourceIndex, 1)
      draft.splice(destinationIndex, 0, removed)
    })

    await this.options.set(newData)
  }

  // Persist an explicit ordering. Used when the displayed list groups configs
  // (instances), so a single drag moves a block that index math can't express.
  async setOrder(orderedIds: string[]) {
    const configs = await this.options.get()
    const byId = new Map(configs.map((config) => [config.id, config]))
    const ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((config): config is ProviderConfig => config !== undefined)
    if (
      orderedIds.length !== configs.length ||
      ordered.length !== configs.length ||
      new Set(orderedIds).size !== configs.length
    ) {
      throw new Error('setOrder must list every provider config exactly once')
    }
    await this.options.set(ordered)
  }
}
