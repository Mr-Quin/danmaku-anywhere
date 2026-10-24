import { inject, injectable } from 'inversify'
import { z } from 'zod'
import { AppError } from '@/common/errors/AppError'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { IStoreService } from '@/common/options/IStoreService'
import {
  type IOptionsServiceFactory,
  OptionsServiceFactory,
} from '@/common/options/OptionsService/OptionServiceFactory'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { providerConfigDescriptor } from '@/common/options/optionStores'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { withoutLockedValues } from './builtin'
import { normalizeCustomName } from './customName'
import {
  ensureBuiltinProviders,
  legacyDefaultProviderConfigs,
  migrateBuiltinPrefixedProviderIds,
  migrateDanDanPlayApiBaseUrl,
  migrateDropDeadProviderFields,
  migrateProviderConfigsToFlat,
  migrateToCustomNames,
} from './migration'
import { type ProviderConfig, providerConfigSchema } from './schema'
import { LATEST_PROVIDER_CONFIG_VERSION } from './version'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// A restored entry gets the same normalization a write would apply: a tidy
// name and no settings the extension owns on a built-in.
const restoredConfigSchema = z
  .preprocess((entry) => {
    if (!isRecord(entry) || typeof entry.manifestId !== 'string') {
      return entry
    }
    return {
      ...entry,
      customName: normalizeCustomName({
        manifestId: entry.manifestId,
        customName: entry.customName,
        configValues: entry.configValues,
      }),
    }
  }, providerConfigSchema)
  .transform((config) => withoutLockedValues(config))

// Reads and migrations. Every write goes through ProviderConfigWriter, which
// checks it and serializes it with the store's other writes.
@injectable('Singleton')
export class ProviderConfigService implements IStoreService {
  public readonly name = 'providerConfig'
  public readonly descriptor = providerConfigDescriptor
  public readonly options: OptionsService<ProviderConfig[]>
  public readonly backupItemSchema = restoredConfigSchema

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
      providerConfigDescriptor,
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
      .version(LATEST_PROVIDER_CONFIG_VERSION, {
        upgrade: (data) => {
          try {
            return migrateToCustomNames(data)
          } catch (error) {
            // Keep the configs; a failed step must not cost the user them.
            console.error(
              '[providerConfig] custom-name migration failed, leaving configs unchanged:',
              error
            )
            return data
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
      throw new AppError(
        'config.notFound',
        {},
        {
          message: `Provider config with ID "${id}" not found, it might have been deleted.`,
        }
      )
    }
    return config
  }

  async getAll() {
    return this.options.get()
  }
}
