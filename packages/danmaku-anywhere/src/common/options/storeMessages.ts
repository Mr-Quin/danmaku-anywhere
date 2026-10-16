import { i18n } from '@/common/localization/i18n'
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

// Why a store could not be saved or upgraded, shown after the store's name
// on the upgrade screen and in the messages for a failed save or restore.
export function describeOptionsProblem(problem: UpgradeProblem): string {
  switch (problem) {
    case 'options.itemTooLarge':
      return i18n.t(
        'optionsStorage.problem.itemTooLarge',
        "It is too large for the browser's synced storage."
      )
    case 'options.storeFull':
      return i18n.t(
        'optionsStorage.problem.storeFull',
        "The browser's storage for this extension's settings is full."
      )
    case 'options.writeRateLimited':
      return i18n.t(
        'optionsStorage.problem.writeRateLimited',
        'It was saved too many times in a short while. Try again in a minute.'
      )
    case 'options.incomplete':
      return i18n.t(
        'optionsStorage.problem.incomplete',
        'The stored copy is incomplete, possibly because it is still syncing from another device. Try again in a moment.'
      )
    case 'unknown':
      return i18n.t(
        'optionsStorage.problem.unknown',
        'It could not be updated.'
      )
  }
}

export function describeSaveFailure(
  problem: UpgradeProblem,
  store: string
): string {
  return i18n.t(
    'optionsStorage.saveFailed',
    'Could not save {{name}}. {{reason}}',
    {
      name: localizedStoreName(store),
      reason: describeOptionsProblem(problem),
    }
  )
}
