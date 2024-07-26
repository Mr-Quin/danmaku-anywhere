import { match, P } from 'ts-pattern'

import { Logger } from '@/common/Logger'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { mountConfigService } from '@/common/options/mountConfig/service'
// the ?script part gets the file name of the script
// @ts-expect-error
// eslint-disable-next-line import/no-restricted-paths, import/default
import contentScript from '@/content?script'

const contentScriptId = 'main-content'

const mainScript: chrome.scripting.RegisteredContentScript = {
  id: contentScriptId,
  js: [contentScript],
  matches: [],
  persistAcrossSessions: true,
  allFrames: true,
  runAt: 'document_idle',
  world: 'ISOLATED',
}

const handleContentScriptRegistration = async (mountConfigs: MountConfig[]) => {
  const patterns = mountConfigs
    // only register enabled configs
    .filter((configs) => configs.enabled)
    .map((config) => config.patterns)
    .flat()

  const registeredScript = await chrome.scripting.getRegisteredContentScripts({
    ids: [contentScriptId],
  })

  match([registeredScript.length, patterns.length])
    // no registered script, but has patterns, register the script
    .with([0, P.number.positive()], () => {
      Logger.debug('Registering content scripts', { patterns })
      return chrome.scripting.registerContentScripts([
        {
          ...mainScript,
          matches: patterns,
        },
      ])
    })
    // has registered script and patterns, update the script
    .with([1, P.number.positive()], () => {
      Logger.debug('Updating content scripts', { patterns })
      return chrome.scripting.updateContentScripts([
        {
          id: contentScriptId,
          matches: patterns,
        },
      ])
    })
    // has registered script, but no patterns, unregister the script
    .with([1, 0], () => {
      Logger.debug('Unregistering content scripts')
      return chrome.scripting.unregisterContentScripts({
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
}

export const setupScripting = () => {
  chrome.runtime.onStartup.addListener(async () => {
    const configs = await mountConfigService.get()

    await handleContentScriptRegistration(configs)
  })

  mountConfigService.onChange(async (configs) => {
    if (!configs) return

    await handleContentScriptRegistration(configs)
  })
}
