import { P, match } from 'ts-pattern'

import { mountConfigService } from './syncOptions/upgradeOptions'

import { Logger } from '@/common/services/Logger'
// @ts-expect-error
// eslint-disable-next-line import/no-restricted-paths, import/default
import contentScript from '@/content/index?script'

const contentScriptId = 'main-content'

export const setupScripting = () => {
  const mainScript: chrome.scripting.RegisteredContentScript = {
    id: contentScriptId,
    js: [contentScript],
    matches: [],
    persistAcrossSessions: true,
    allFrames: true,
    runAt: 'document_idle',
    world: 'ISOLATED',
  }

  mountConfigService.onChange(async (configs) => {
    if (!configs) return

    // assume patterns is valid
    const patterns = configs
      // only register enabled configs
      .filter((configs) => configs.enabled)
      .map((config) => config.patterns)
      .flat()

    const registeredScript = await chrome.scripting.getRegisteredContentScripts(
      {
        ids: [contentScriptId],
      }
    )

    match([registeredScript.length, patterns.length])
      // no registered script, but has patterns, register the script
      .with([0, P.number.positive()], () => {
        Logger.debug('Registering content scripts', { patterns })
        chrome.scripting.registerContentScripts([
          {
            ...mainScript,
            matches: patterns,
          },
        ])
      })
      // has registered script and patterns, update the script
      .with([1, P.number.positive()], () => {
        Logger.debug('Updating content scripts', { patterns })
        chrome.scripting.updateContentScripts([
          {
            id: contentScriptId,
            matches: patterns,
          },
        ])
      })
      // has registered script, but no patterns, unregister the script
      .with([1, 0], () => {
        Logger.debug('Unregistering content scripts')
        chrome.scripting.unregisterContentScripts({
          ids: [contentScriptId],
        })
      })
      .with([P.number.positive(), P.any], () => {
        Logger.error(
          'Invalid state: multiple registered scripts when there should be only one'
        )
      })
      .otherwise(() => {
        // do nothing
      })
  })
}
