import {
  createCloudBackup as createCloudBackupApi,
  downloadCloudBackup as downloadCloudBackupApi,
  listCloudBackups,
} from '@danmaku-anywhere/danmaku-provider/backup'
import { inject, injectable } from 'inversify'
import { ConfigStateService } from '@/background/services/Backup/ConfigStateService'
import type { IBackupSink } from '@/background/services/Backup/sinks/BackupSink.interface'
import { fromProviderApiError } from '@/background/services/providers/providerErrors'
import type {
  BackupData,
  BackupRestoreResult,
  CloudBackupItem,
} from '@/common/backup/dto'
import { AppError } from '@/common/errors/AppError'
import { UserAuthStore } from '@/common/options/userAuth/service'

@injectable('Singleton')
export class BackupService {
  constructor(
    @inject(ConfigStateService)
    private configStateService: ConfigStateService,
    @inject(UserAuthStore)
    private userAuthStore: UserAuthStore
  ) {}

  async getBackupData(): Promise<BackupData> {
    return this.configStateService.getState()
  }

  async importAll(backup: unknown): Promise<BackupRestoreResult> {
    let backupData = backup
    if (typeof backup === 'string') {
      try {
        backupData = JSON.parse(backup)
      } catch {
        throw new AppError(
          'backup.notJson',
          {},
          { message: 'Failed to parse backup data as JSON' }
        )
      }
    }
    return this.configStateService.restoreState(backupData)
  }

  async backupTo(sink: IBackupSink): Promise<void> {
    const data = await this.configStateService.getState()
    await sink.save(data)
  }

  private async getAuth() {
    await this.userAuthStore.ensureReady()
    return { token: this.userAuthStore.getTokenSync() }
  }

  async getCloudBackups(): Promise<CloudBackupItem[]> {
    const result = await listCloudBackups(await this.getAuth())
    if (!result.success) {
      throw fromProviderApiError(result.error, { kind: 'cloud' })
    }
    return result.data
  }

  async createCloudBackup(): Promise<{ success: boolean; id: string }> {
    const data = await this.getBackupData()
    const result = await createCloudBackupApi(
      data,
      data.meta.extensionVersion,
      await this.getAuth()
    )
    if (!result.success) {
      throw fromProviderApiError(result.error, { kind: 'cloud' })
    }
    return result.data
  }

  async downloadCloudBackup(id: string): Promise<unknown> {
    const result = await downloadCloudBackupApi(id, await this.getAuth())
    if (!result.success) {
      throw fromProviderApiError(result.error, { kind: 'cloud' })
    }
    return result.data
  }
}
