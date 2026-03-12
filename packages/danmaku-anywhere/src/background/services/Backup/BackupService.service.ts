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

  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.userAuthStore.getTokenSync()}`,
      'Content-Type': 'application/json',
    }
  }

  private getBaseUrl() {
    const baseUrl = import.meta.env.VITE_PROXY_URL
    if (!baseUrl) {
      throw new Error('VITE_PROXY_URL is not configured')
    }
    return new URL('/api/backup', baseUrl).toString()
  }

  async getCloudBackups(): Promise<CloudBackupItem[]> {
    const url = this.getBaseUrl()
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch cloud backups')
    }
    const result = await response.json()
    return result.backups as CloudBackupItem[]
  }

  async createCloudBackup(): Promise<{ success: boolean; id: string }> {
    const data = await this.getBackupData()
    const url = this.getBaseUrl()
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ data }),
    })
    if (!response.ok) {
      throw new Error('Failed to create cloud backup')
    }
    return response.json() as Promise<{ success: boolean; id: string }>
  }

  async downloadCloudBackup(id: string): Promise<BackupData> {
    const url = `${this.getBaseUrl()}/${id}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to download cloud backup')
    }
    const result = await response.json()
    return result.data as BackupData
  }
}
