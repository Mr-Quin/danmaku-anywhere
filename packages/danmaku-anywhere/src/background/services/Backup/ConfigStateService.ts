import { inject, injectable, multiInject } from 'inversify'
import type {
  BackupData,
  BackupRestoreResult,
  ServiceBackupData,
} from '@/common/backup/dto'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'

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
      this.services.map(async (service) => {
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
        version: 1,
        timestamp: Date.now(),
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

  async restoreState(backup: BackupData): Promise<BackupRestoreResult> {
    if (
      !backup ||
      !backup.meta ||
      typeof backup.meta.version !== 'number' ||
      !backup.services
    ) {
      throw new Error('Invalid backup format')
    }

    const { services } = backup
    const result: BackupRestoreResult = {
      success: true,
      details: {},
    }

    const restoreService = async (
      name: string,
      service: IStoreService,
      backupData?: ServiceBackupData<unknown>
    ) => {
      if (!backupData) return

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
    }

    await Promise.all(
      this.services.map((service) => {
        return restoreService(service.name, service, services[service.name])
      })
    )

    return result
  }
}
