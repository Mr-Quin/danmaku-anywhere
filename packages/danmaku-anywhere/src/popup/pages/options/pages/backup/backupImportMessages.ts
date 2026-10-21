import type { BackupRestoreResult } from '@/common/backup/dto'
import { formatList } from '@/common/localization/formatList'
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

export function describeRestoreProblems(result: BackupRestoreResult): string {
  const names = Object.entries(result.details)
    .filter(([, detail]) => {
      return !detail.success || (detail.droppedEntries ?? 0) > 0
    })
    .map(([name]) => localizedBackupStoreName(name))
  return formatList(names)
}
