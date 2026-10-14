import { getBackupFileProblem } from '@/common/backup/BackupFileError'
import type { BackupRestoreResult } from '@/common/backup/dto'
import { i18n } from '@/common/localization/i18n'

export function localizedBackupStoreName(name: string): string {
  switch (name) {
    case 'extensionOptions':
      return i18n.t(
        'optionsPage.backup.store.extensionOptions',
        'General settings'
      )
    case 'danmakuOptions':
      return i18n.t('tabs.style', 'Danmaku Settings')
    case 'mountConfig':
      return i18n.t('configPage.name', 'Configs')
    case 'providerConfig':
      return i18n.t('tabs.providers', 'Sources')
    case 'aiProviderConfig':
      return i18n.t('tabs.aiProviders', 'AI Providers')
    case 'integrationPolicy':
      return i18n.t('integrationPolicyPage.name', 'Integration Policy')
    case 'localMatchingRule':
      return i18n.t(
        'optionsPage.backup.store.localMatchingRule',
        'Naming rules'
      )
    default:
      return name
  }
}

const SHOWN_REASONS = 3

function describeDropped(
  name: string,
  detail: BackupRestoreResult['details'][string]
): string {
  const store = localizedBackupStoreName(name)
  const count = detail.droppedEntries ?? 0
  if (detail.success === false || count === 0) {
    return store
  }
  const reasons = [
    ...new Set(
      (detail.dropped ?? []).map((entry) => {
        return entry.id ? `${entry.id}: ${entry.reason}` : entry.reason
      })
    ),
  ]
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

export function describeRestoreProblems(result: BackupRestoreResult): string {
  const problems = Object.entries(result.details)
    .filter(([, detail]) => {
      return !detail.success || (detail.droppedEntries ?? 0) > 0
    })
    .map(([name, detail]) => describeDropped(name, detail))
  return new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    problems
  )
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
