import { i18n } from '@/common/localization/i18n'
import type { OptionsStorageProblem } from './OptionsService/OptionsStorageError'
import type { UpgradeProblem } from './upgrade/upgradeFailure'

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

export function describeOptionsWriteError(
  problem: OptionsStorageProblem,
  store: string
): string {
  const name = localizedStoreName(store)
  switch (problem) {
    case 'itemTooLarge':
      return i18n.t(
        'optionsStorage.error.itemTooLarge',
        '{{name}} could not be saved: they are too large for synced storage. Remove some entries and try again.',
        { name }
      )
    case 'storeFull':
      return i18n.t(
        'optionsStorage.error.storeFull',
        "{{name}} could not be saved: the browser's storage for this extension's settings is full. Remove some block rules, custom CSS or configs and try again.",
        { name }
      )
    case 'writeRateLimited':
      return i18n.t(
        'optionsStorage.error.writeRateLimited',
        '{{name}} could not be saved: settings were changed too many times in a short while. Wait a minute and try again.',
        { name }
      )
    case 'incomplete':
      return i18n.t(
        'optionsStorage.error.incomplete',
        '{{name}} could not be saved: the stored copy is incomplete, possibly because it is still syncing from another device. Try again in a moment.',
        { name }
      )
  }
}

// Why a store failed to upgrade, shown after the store's name.
export function describeUpgradeProblem(problem: UpgradeProblem): string {
  switch (problem) {
    case 'itemTooLarge':
      return i18n.t(
        'optionsUpgrade.problem.itemTooLarge',
        'Too large to save in synced storage.'
      )
    case 'storeFull':
      return i18n.t(
        'optionsUpgrade.problem.storeFull',
        "The browser's storage for this extension's settings is full."
      )
    case 'writeRateLimited':
      return i18n.t(
        'optionsUpgrade.problem.writeRateLimited',
        'Saved too many times in a short while. Retry in a minute.'
      )
    case 'incomplete':
      return i18n.t(
        'optionsUpgrade.problem.incomplete',
        'The stored copy is incomplete, possibly because it is still syncing from another device. Retry in a moment.'
      )
    case 'unknown':
      return i18n.t('optionsUpgrade.problem.unknown', 'Could not be updated.')
  }
}
