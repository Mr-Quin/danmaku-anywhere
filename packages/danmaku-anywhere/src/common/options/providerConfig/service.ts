import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import {
  ensureBuiltinProviders,
  legacyDefaultProviderConfigs,
  migrateBuiltinPrefixedProviderIds,
  migrateDanDanPlayApiBaseUrl,
  migrateDropDeadProviderFields,
  migrateProviderConfigsToFlat,
  migrateToCustomNames,
} from './migration'
import type { ProviderConfig } from './schema'
import { isLegacyMacCms } from './utils'

// Reads and migrations. Every write goes through ProviderConfigWriter in the
// background, which checks it and serializes it with the store's other writes.
@injectable('Singleton')
export class ProviderConfigService implements IStoreService {
  public readonly name = 'providerConfig'
  public readonly options: OptionsService<ProviderConfig[]>

  // Stored in sync alongside the configs so a second signed-in device reads the
  // same flag and does not re-seed the shared store.
  private readonly seededFlag = new ExtStorageService<boolean>(
    'providerConfigSeeded',
    { storageType: 'sync' }
  )

  constructor(
    @inject(LoggerSymbol)
    private readonly logger: ILogger,
    @inject(OptionsServiceFactory)
    private readonly optionServiceFactory: IOptionsServiceFactory
  ) {
    this.options = this.optionServiceFactory<ProviderConfig[]>(
      'providerConfig',
      // Fresh installs start empty and are seeded after the catalog loads.
      [],
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
            return [...legacyDefaultProviderConfigs]
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
            return [...legacyDefaultProviderConfigs]
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
      .version(5, {
        upgrade: (data) => {
          try {
            return migrateDropDeadProviderFields(data)
          } catch (error) {
            // Dropping dead fields is cosmetic; never cost the user their
            // configs over it.
            console.error(
              '[providerConfig] dead-field migration failed, leaving configs unchanged:',
              error
            )
            return data
          }
        },
      })
      .version(6, {
        upgrade: (data) => {
          try {
            return migrateToCustomNames(data)
          } catch (error) {
            console.error(
              '[providerConfig] custom-name migration failed, falling back to defaults:',
              error
            )
            return migrateToCustomNames(legacyDefaultProviderConfigs)
          }
        },
      })
  }

  async hasSeeded(): Promise<boolean> {
    return (await this.seededFlag.read()) === true
  }

  async markSeeded(): Promise<void> {
    await this.seededFlag.set(true)
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
    return !isLegacyMacCms(config)
  }
}
