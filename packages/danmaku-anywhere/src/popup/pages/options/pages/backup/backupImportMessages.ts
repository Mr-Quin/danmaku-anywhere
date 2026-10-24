import type {
  BackupRestoreResult,
  DroppedEntry,
  DropReason,
} from '@/common/backup/dto'
import { describeCode } from '@/common/errors/describeError'
import { formatList } from '@/common/localization/formatList'
import { i18n } from '@/common/localization/i18n'
import { localizedStoreName } from '@/common/options/storeMessages'

const SHOWN_REASONS = 3

function describeDropReason(reason: DropReason): string {
  switch (reason) {
    case 'invalidEntry':
      return i18n.t(
        'optionsPage.backup.dropReason.invalidEntry',
        'the entry is damaged'
      )
    case 'notMigrated':
      return i18n.t(
        'optionsPage.backup.dropReason.notMigrated',
        'it could not be converted from an older version'
      )
    case 'duplicateId':
      return i18n.t(
        'optionsPage.backup.dropReason.duplicateId',
        'another entry in the backup has the same id'
      )
    case 'invalidSettings':
      return i18n.t(
        'optionsPage.backup.dropReason.invalidSettings',
        'its settings are not valid for its source'
      )
    case 'nameRequired':
      return i18n.t(
        'optionsPage.backup.dropReason.nameRequired',
        'it has no name'
      )
  }
}

function describeDroppedEntry(entry: DroppedEntry): string {
  const reason = describeDropReason(entry.reason)
  return entry.label ? `${entry.label}: ${reason}` : reason
}

function describeDropped(
  name: string,
  detail: BackupRestoreResult['details'][string]
): string {
  const store = localizedStoreName(name)
  const count = detail.droppedEntries ?? 0
  if (detail.success === false || count === 0) {
    return store
  }
  const reasons = [...new Set((detail.dropped ?? []).map(describeDroppedEntry))]
  if (reasons.length === 0) {
    return i18n.t(
      'optionsPage.backup.droppedEntries',
      '{{store}} ({{count}} entries skipped)',
      { store, count }
    )
  }
  return i18n.t(
    'optionsPage.backup.droppedEntriesWithReasons',
    '{{store}} ({{count}} entries skipped: {{reasons}})',
    { store, count, reasons: reasons.slice(0, SHOWN_REASONS).join('; ') }
  )
}

function listStores(names: string[]): string {
  return formatList(names.map(localizedStoreName))
}

// Settings the backup did not include, which the restore left as they were
export function describeMissingStores(result: BackupRestoreResult): string {
  return listStores(result.missing ?? [])
}

export function describeRestoreProblems(result: BackupRestoreResult): string {
  const problems = Object.entries(result.details)
    .filter(([, detail]) => {
      return !detail.success || (detail.droppedEntries ?? 0) > 0
    })
    .map(([name, detail]) => describeDropped(name, detail))
  return formatList(problems)
}

// Why the browser refused the stores it refused, as sentences to follow
// the list of stores.
export function describeRestoreStorageProblems(
  result: BackupRestoreResult
): string[] {
  return Object.entries(result.details).flatMap(([name, detail]) => {
    if (!detail.code) {
      return []
    }
    return [describeCode(detail.code, { store: name })]
  })
}
