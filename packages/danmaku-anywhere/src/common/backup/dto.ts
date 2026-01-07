export interface ServiceBackupData<T> {
  version: number
  data: T
}

export interface BackupData {
  meta: {
    version: number
    timestamp: number
  }
  services: {
    danmakuOptions?: ServiceBackupData<unknown>
    extensionOptions?: ServiceBackupData<unknown>
    mountConfig?: ServiceBackupData<unknown>
    providerConfig?: ServiceBackupData<unknown>
    integrationPolicy?: ServiceBackupData<unknown>
  }
}

export interface BackupRestoreResult {
  success: boolean
  details: {
    [key in keyof BackupData['services']]?: {
      success: boolean
      error?: string
    }
  }
}
