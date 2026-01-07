import type { BackupData } from '@/common/backup/dto'

export interface IBackupSink {
  name: string
  save(data: BackupData): Promise<void>
}
