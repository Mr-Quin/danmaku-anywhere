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

export interface DroppedEntry {
  id?: string
  reason: string
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
      /** Why each dropped entry was refused, with its id when it had one. */
      dropped?: DroppedEntry[]
    }
  >
}

export interface CloudBackupItem {
  id: string
  createdAt: number
  extensionVersion: string | null
}
