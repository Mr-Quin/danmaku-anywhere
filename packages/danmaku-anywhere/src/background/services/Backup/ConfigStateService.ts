import { inject, injectable } from 'inversify'
import type {
  BackupData,
  BackupRestoreResult,
  ServiceBackupData,
} from '@/common/backup/dto'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { DanmakuOptionsService } from '@/common/options/danmakuOptions/service'
import { ExtensionOptionsService } from '@/common/options/extensionOptions/service'
import type { IntegrationPolicyService as IntegrationPolicyServiceType } from '@/common/options/integrationPolicyStore/service'
import { IntegrationPolicyService } from '@/common/options/integrationPolicyStore/service'

import { MountConfigService } from '@/common/options/mountConfig/service'
import { ProviderConfigService } from '@/common/options/providerConfig/service'

@injectable('Singleton')
export class ConfigStateService {
  private logger: ILogger

  constructor(
    @inject(DanmakuOptionsService)
    private danmakuOptionsService: DanmakuOptionsService,
    @inject(ExtensionOptionsService)
    private extensionOptionsService: ExtensionOptionsService,
    @inject(MountConfigService)
    private mountConfigService: MountConfigService,
    @inject(ProviderConfigService)
    private providerConfigService: ProviderConfigService,
    @inject(IntegrationPolicyService)
    private integrationPolicyService: IntegrationPolicyServiceType,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[ConfigStateService]')
  }

  async getState(): Promise<BackupData> {
    const [
      danmakuOptions,
      danmakuVersion,
      extensionOptions,
      extensionVersion,
      mountConfig,
      mountVersion,
      providerConfig,
      providerVersion,
      integrationPolicy,
      integrationVersion,
    ] = await Promise.all([
      this.danmakuOptionsService.options.get(),
      this.danmakuOptionsService.options.getVersion(),
      this.extensionOptionsService.options.get(),
      this.extensionOptionsService.options.getVersion(),
      this.mountConfigService.options.get(),
      this.mountConfigService.options.getVersion(),
      this.providerConfigService.options.get(),
      this.providerConfigService.options.getVersion(),
      this.integrationPolicyService.options.get(),
      this.integrationPolicyService.options.getVersion(),
    ])

    return {
      meta: {
        version: 1,
        timestamp: Date.now(),
      },
      services: {
        danmakuOptions: {
          data: danmakuOptions,
          version: danmakuVersion,
        },
        extensionOptions: {
          data: extensionOptions,
          version: extensionVersion,
        },
        mountConfig: {
          data: mountConfig,
          version: mountVersion,
        },
        providerConfig: {
          data: providerConfig,
          version: providerVersion,
        },
        integrationPolicy: {
          data: integrationPolicy,
          version: integrationVersion,
        },
      },
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

    const restoreService = async <T>(
      name: keyof BackupData['services'],
      service: {
        options: {
          set: (data: T, version: number) => Promise<unknown>
          upgrade: () => Promise<void>
        }
      },
      backupData?: ServiceBackupData<unknown>
    ) => {
      if (!backupData) return

      try {
        this.logger.debug(`Restoring ${name}...`)
        await service.options.set(backupData.data as T, backupData.version)
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

    await Promise.all([
      restoreService(
        'danmakuOptions',
        this.danmakuOptionsService,
        services.danmakuOptions
      ),
      restoreService(
        'extensionOptions',
        this.extensionOptionsService,
        services.extensionOptions
      ),
      restoreService(
        'mountConfig',
        this.mountConfigService,
        services.mountConfig
      ),
      restoreService(
        'providerConfig',
        this.providerConfigService,
        services.providerConfig
      ),
      restoreService(
        'integrationPolicy',
        this.integrationPolicyService,
        services.integrationPolicy
      ),
    ])

    return result
  }
}
