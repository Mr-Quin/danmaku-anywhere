export interface ServiceBackupData<T> {
  version: number
  data: T
}

export interface BackupData {
  meta: {
    version: number
    timestamp: number
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
    }
  >
}
