import {
  createCloudBackup as createCloudBackupApi,
  downloadCloudBackup as downloadCloudBackupApi,
  listCloudBackups,
} from '@danmaku-anywhere/danmaku-provider/backup'
import { inject, injectable } from 'inversify'
import { ConfigStateService } from '@/background/services/Backup/ConfigStateService'
import type { IBackupSink } from '@/background/services/Backup/sinks/BackupSink.interface'
import type {
  BackupData,
  BackupRestoreResult,
  CloudBackupItem,
} from '@/common/backup/dto'
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
        throw new Error('Failed to parse backup data as JSON')
      }
    }
    // TODO: validate backup data
    return this.configStateService.restoreState(backupData as BackupData)
  }

  async backupTo(sink: IBackupSink): Promise<void> {
    const data = await this.configStateService.getState()
    await sink.save(data)
  }

  private getAuth() {
    return { token: this.userAuthStore.getTokenSync() }
  }

  async getCloudBackups(): Promise<CloudBackupItem[]> {
    const result = await listCloudBackups(this.getAuth())
    if (!result.success) {
      throw result.error
    }
    return result.data
  }

  async createCloudBackup(): Promise<{ success: boolean; id: string }> {
    const data = await this.getBackupData()
    const result = await createCloudBackupApi(
      data,
      data.meta.extensionVersion,
      this.getAuth()
    )
    if (!result.success) {
      throw result.error
    }
    return result.data
  }

  async downloadCloudBackup(id: string): Promise<BackupData> {
    const result = await downloadCloudBackupApi(id, this.getAuth())
    if (!result.success) {
      throw result.error
    }
    return result.data as BackupData
  }
}
