import { inject, injectable, multiInject } from 'inversify'
import { prettifyError } from 'zod'
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
        const error = await this.validatePayload(service, backupData)
        if (error) {
          this.logger.error(`Rejected backup data for ${service.name}`, error)
          result.success = false
          result.details[service.name] = { success: false, error }
        }
        return { service, backupData, valid: !error }
      })
    )

    await Promise.all(
      validated
        .filter((candidate) => candidate.valid)
        .map(async ({ service, backupData }) => {
          const { name } = service
          try {
            this.logger.debug(`Restoring ${name}...`)
            await service.options.set(backupData.data, backupData.version)
            await service.options.upgrade()
            result.details[name] = { success: true }
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

  private async validatePayload(
    service: IStoreService,
    backupData: ServiceBackup
  ): Promise<string | undefined> {
    const { latestVersion } = service.options

    if (backupData.version > latestVersion) {
      return `Backup holds version ${backupData.version} of this store, which is newer than the supported version ${latestVersion}`
    }

    // Older payloads predate the current schema and are brought up to date by
    // the store's own migrations, so only the current shape can be checked here.
    if (backupData.version < latestVersion || !service.backupSchema) {
      return
    }

    const parsed = await service.backupSchema.safeParseAsync(backupData.data)

    if (!parsed.success) {
      return prettifyError(parsed.error)
    }
  }
}
