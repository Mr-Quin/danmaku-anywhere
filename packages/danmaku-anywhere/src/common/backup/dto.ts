import type { OptionsStorageProblem } from '@/common/options/OptionsService/OptionsStorageError'
export interface ServiceBackupData<T> {
  version: number
  data: T
}

export interface BackupData {
  meta: {
    version: number
    timestamp: number
    extensionVersion?: string
  }
  services: Record<string, ServiceBackupData<unknown>>
}

export interface BackupRestoreResult {
  success: boolean
  details: Record<
    string,
    {
      success: boolean
      error?: string
      /** Entries dropped because they failed validation. */
      droppedEntries?: number
      /** Set when the browser's storage refused the restored data. */
      storageProblem?: OptionsStorageProblem
    }
  >
}

export interface CloudBackupItem {
  id: string
  createdAt: number
  extensionVersion: string | null
}
