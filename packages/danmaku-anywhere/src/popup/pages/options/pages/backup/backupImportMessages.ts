import { getBackupFileProblem } from '@/common/backup/BackupFileError'
import type { BackupRestoreResult } from '@/common/backup/dto'
import { i18n } from '@/common/localization/i18n'
import {
  describeSaveFailure,
  localizedStoreName,
} from '@/common/options/storeMessages'

export function describeRestoreProblems(result: BackupRestoreResult): string {
  const names = Object.entries(result.details)
    .filter(([, detail]) => {
      return !detail.success || (detail.droppedEntries ?? 0) > 0
    })
    .map(([name]) => localizedStoreName(name))
  return new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    names
  )
}

// Why the browser refused the stores it refused, as sentences to follow
// the list of stores.
export function describeRestoreStorageProblems(
  result: BackupRestoreResult
): string[] {
  return Object.entries(result.details).flatMap(([name, detail]) => {
    if (!detail.storageProblem) {
      return []
    }
    return [describeSaveFailure(detail.storageProblem, name)]
  })
}

export function describeBackupImportError(error: unknown): string {
  switch (getBackupFileProblem(error)) {
    case 'notJson':
      return i18n.t(
        'optionsPage.backup.error.notJson',
        'This file is not a Danmaku Anywhere backup.'
      )
    case 'invalidFormat':
      return i18n.t(
        'optionsPage.backup.error.invalidFormat',
        'This backup file is damaged or was not made by Danmaku Anywhere.'
      )
    case 'unsupportedVersion':
      return i18n.t(
        'optionsPage.backup.error.unsupportedVersion',
        'This version of Danmaku Anywhere cannot read this backup format.'
      )
    default: {
      const message = error instanceof Error ? error.message : String(error)
      return `${i18n.t('optionsPage.backup.importError', 'Import failed')}: ${message}`
    }
  }
}
