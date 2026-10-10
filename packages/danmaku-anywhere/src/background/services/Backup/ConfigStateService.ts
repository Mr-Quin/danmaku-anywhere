import { inject, injectable, multiInject } from 'inversify'
import { prettifyError, type ZodType } from 'zod'
import type { BackupData, BackupRestoreResult } from '@/common/backup/dto'
import {
  BACKUP_FORMAT_VERSION,
  backupDataSchema,
  type ParsedBackupData,
} from '@/common/backup/schema'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import type { UpgradeContext } from '@/common/options/OptionsService/types'

type ServiceBackup = ParsedBackupData['services'][string]

type PayloadCheck =
  | { ok: true; data: unknown; droppedEntries: number }
  | { ok: false; error: string }

type MigrationResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

@injectable('Singleton')
export class ConfigStateService {
  private logger: ILogger

  constructor(
    @multiInject(StoreServiceSymbol)
    private services: IStoreService[],
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[ConfigStateService]')
  }

  async getState(): Promise<BackupData> {
    const services = await Promise.all(
      this.services
        .filter((service) => service.shouldBackup !== false)
        .map(async (service) => {
          const [data, version] = await Promise.all([
            service.options.get(),
            service.options.getVersion(),
          ])
          return {
            name: service.name,
            data: {
              data,
              version,
            },
          }
        })
    )

    return {
      meta: {
        version: BACKUP_FORMAT_VERSION,
        timestamp: Date.now(),
        extensionVersion: chrome.runtime.getManifest().version,
      },
      services: services.reduce(
        (acc, { name, data }) => {
          acc[name] = data
          return acc
        },
        {} as BackupData['services']
      ),
    }
  }

  async restoreState(backup: unknown): Promise<BackupRestoreResult> {
    const parsed = backupDataSchema.safeParse(backup)

    if (!parsed.success) {
      throw new Error(`Invalid backup format: ${prettifyError(parsed.error)}`)
    }

    const { meta, services } = parsed.data

    if (meta.version !== BACKUP_FORMAT_VERSION) {
      throw new Error(
        `Unsupported backup version ${meta.version}, this extension can only restore version ${BACKUP_FORMAT_VERSION} backups`
      )
    }

    const result: BackupRestoreResult = {
      success: true,
      details: {},
    }

    const candidates = this.services
      .filter((service) => service.shouldBackup !== false)
      .map((service) => {
        return { service, backupData: services[service.name] }
      })
      .filter((candidate) => candidate.backupData !== undefined)

    const context: UpgradeContext = Object.fromEntries(
      candidates.map(({ service, backupData }) => {
        return [service.options.key, backupData.data]
      })
    )

    const validated = await Promise.all(
      candidates.map(async ({ service, backupData }) => {
        const check = await this.checkPayload(service, backupData, context)
        if (!check.ok) {
          this.logger.error(
            `Rejected backup data for ${service.name}`,
            check.error
          )
          result.success = false
          result.details[service.name] = { success: false, error: check.error }
        }
        return { service, check }
      })
    )

    await Promise.all(
      validated.map(async ({ service, check }) => {
        if (!check.ok) {
          return
        }
        const { name } = service
        try {
          this.logger.debug(`Restoring ${name}...`)
          await service.options.set(check.data, service.options.latestVersion)
          result.details[name] = {
            success: true,
            droppedEntries: check.droppedEntries,
          }
          if (check.droppedEntries > 0) {
            result.success = false
          }
        } catch (error) {
          this.logger.error(`Failed to restore ${name}`, error)
          result.success = false
          result.details[name] = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      })
    )

    return result
  }

  private async checkPayload(
    service: IStoreService,
    backupData: ServiceBackup,
    context: UpgradeContext
  ): Promise<PayloadCheck> {
    const { latestVersion } = service.options
    const { backupItemSchema, backupSchema } = service

    if (backupData.version > latestVersion) {
      return {
        ok: false,
        error: `Backup holds version ${backupData.version} of this store, which is newer than the supported version ${latestVersion}`,
      }
    }

    if (backupItemSchema) {
      // Some list migrations turn a non-list into an empty list, which would
      // quietly wipe the store, so the shape is checked before migrating.
      if (!Array.isArray(backupData.data)) {
        return { ok: false, error: 'Expected a list of entries' }
      }
      const migrated = this.migrate(service, backupData, context)
      if (!migrated.ok) {
        return migrated
      }
      return this.checkEntries(
        backupItemSchema,
        backupData.data.length,
        migrated.data
      )
    }

    const migrated = this.migrate(service, backupData, context)
    if (!migrated.ok) {
      return migrated
    }

    if (!backupSchema) {
      return { ok: true, data: migrated.data, droppedEntries: 0 }
    }

    const parsed = await backupSchema.safeParseAsync(migrated.data)

    if (!parsed.success) {
      return { ok: false, error: prettifyError(parsed.error) }
    }

    return { ok: true, data: migrated.data, droppedEntries: 0 }
  }

  private migrate(
    service: IStoreService,
    backupData: ServiceBackup,
    context: UpgradeContext
  ): MigrationResult {
    try {
      return {
        ok: true,
        data: service.options.migrate(
          backupData.data,
          backupData.version,
          context
        ),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        ok: false,
        error: `Could not migrate the restored data: ${message}`,
      }
    }
  }

  private async checkEntries(
    itemSchema: ZodType,
    entryCount: number,
    migrated: unknown
  ): Promise<PayloadCheck> {
    if (!Array.isArray(migrated)) {
      return { ok: false, error: 'Expected a list of entries' }
    }

    const checked = await Promise.all(
      migrated.map((entry) => {
        return itemSchema.safeParseAsync(entry)
      })
    )
    const kept = migrated.filter((_, index) => checked[index].success)

    // Writing an empty list would wipe the store, so a payload where nothing
    // survives migration and validation is a failure rather than an empty
    // restore.
    if (entryCount > 0 && kept.length === 0) {
      return {
        ok: false,
        error: `All ${entryCount} entries failed validation`,
      }
    }

    return {
      ok: true,
      data: kept,
      droppedEntries: migrated.length - kept.length,
    }
  }
}
