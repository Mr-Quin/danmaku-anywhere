import { i18n } from '@/common/localization/i18n'

// Takes a store's backup name or its storage key; the integration policy is
// the one store where the two differ.
export function localizedStoreName(name: string): string {
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
    case 'xpathPolicy':
      return i18n.t('integrationPolicyPage.name', 'Integration Policy')
    case 'localMatchingRule':
      return i18n.t(
        'optionsPage.backup.store.localMatchingRule',
        'Naming rules'
      )
    case 'searchHistory':
      return i18n.t('optionsStore.searchHistory', 'Search history')
    case 'userAuth':
      return i18n.t('optionsStore.userAuth', 'Account sign-in')
    default:
      return name
  }
}
