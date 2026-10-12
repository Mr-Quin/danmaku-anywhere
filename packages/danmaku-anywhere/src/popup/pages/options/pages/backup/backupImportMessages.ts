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
      return i18n.t('tabs.providers', 'Providers')
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

export function describeRestoreProblems(result: BackupRestoreResult): string {
  const names = Object.entries(result.details)
    .filter(([, detail]) => {
      return !detail.success || (detail.droppedEntries ?? 0) > 0
    })
    .map(([name]) => localizedBackupStoreName(name))
  return new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    names
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
