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

type ServiceBackup = ParsedBackupData['services'][string]

type PayloadCheck =
  | { ok: true; data: unknown; droppedEntries: number }
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

    const validated = await Promise.all(
      candidates.map(async ({ service, backupData }) => {
        const check = await this.checkPayload(service, backupData)
        if (!check.ok) {
          this.logger.error(
            `Rejected backup data for ${service.name}`,
            check.error
          )
          result.success = false
          result.details[service.name] = { success: false, error: check.error }
        }
        return { service, backupData, check }
      })
    )

    await Promise.all(
      validated
        .filter((candidate) => candidate.check.ok)
        .map(async ({ service, backupData, check }) => {
          const { name } = service
          const droppedEntries = check.ok ? check.droppedEntries : 0
          const data = check.ok ? check.data : backupData.data
          try {
            this.logger.debug(`Restoring ${name}...`)
            await service.options.set(data, backupData.version)
            const outcome = await service.options.upgrade()

            if (outcome === 'reset') {
              result.success = false
              result.details[name] = {
                success: false,
                error:
                  'Could not migrate the restored data, this store was reset to its defaults',
              }
              return
            }

            result.details[name] = { success: true, droppedEntries }
            if (droppedEntries > 0) {
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
    backupData: ServiceBackup
  ): Promise<PayloadCheck> {
    const { latestVersion } = service.options

    if (backupData.version > latestVersion) {
      return {
        ok: false,
        error: `Backup holds version ${backupData.version} of this store, which is newer than the supported version ${latestVersion}`,
      }
    }

    // Older payloads predate the current schema and are brought up to date by
    // the store's own migrations, so only the current shape can be checked here.
    if (backupData.version < latestVersion) {
      return { ok: true, data: backupData.data, droppedEntries: 0 }
    }

    if (service.backupItemSchema) {
      return this.checkEntries(service.backupItemSchema, backupData.data)
    }

    if (!service.backupSchema) {
      return { ok: true, data: backupData.data, droppedEntries: 0 }
    }

    const parsed = await service.backupSchema.safeParseAsync(backupData.data)

    if (!parsed.success) {
      return { ok: false, error: prettifyError(parsed.error) }
    }

    return { ok: true, data: backupData.data, droppedEntries: 0 }
  }

  private async checkEntries(
    itemSchema: ZodType,
    data: unknown
  ): Promise<PayloadCheck> {
    if (!Array.isArray(data)) {
      return { ok: false, error: 'Expected a list of entries' }
    }

    const checked = await Promise.all(
      data.map((entry) => {
        return itemSchema.safeParseAsync(entry)
      })
    )
    const kept = data.filter((_, index) => checked[index].success)
    const droppedEntries = data.length - kept.length

    // Writing an empty list would wipe the store, so a payload where nothing
    // survives is treated as a failure rather than an empty restore.
    if (droppedEntries > 0 && kept.length === 0) {
      return {
        ok: false,
        error: `All ${droppedEntries} entries failed validation`,
      }
    }

    return { ok: true, data: kept, droppedEntries }
  }
}
