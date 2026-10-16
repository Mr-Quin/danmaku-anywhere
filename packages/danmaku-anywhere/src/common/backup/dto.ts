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

// Why a restore left an entry out, described in the UI language at the edge.
export type DropReason =
  | 'invalidEntry'
  | 'notMigrated'
  | 'duplicateId'
  | 'invalidSettings'
  | 'nameRequired'

export interface DroppedEntry {
  id?: string
  // The entry's own name, when it has one the user gave it
  label?: string
  reason: DropReason
  // English, for the log
  detail?: string
}

export interface BackupRestoreResult {
  success: boolean
  // Stores the backup did not carry, which the restore left as they were
  missing?: string[]
  details: Record<
    string,
    {
      success: boolean
      error?: string
      /** Entries dropped because they failed validation. */
      droppedEntries?: number
      /** Why each dropped entry was refused, with its id when it had one. */
      dropped?: DroppedEntry[]
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
