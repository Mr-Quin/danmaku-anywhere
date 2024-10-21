import { match, P } from 'ts-pattern'

import { Logger } from '@/common/Logger'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { mountConfigService } from '@/common/options/mountConfig/service'
/* eslint-disable import/no-restricted-paths, import/default */
// the ?script query is used to get the file path for the script after bundling
// @ts-expect-error
import contentScript from '@/content/controller?script'
// @ts-expect-error
import testScript from '@/content/player?script'
/* eslint-enable import/no-restricted-paths, import/default */

const contentScriptId = 'main-content'

const mainScript: chrome.scripting.RegisteredContentScript = {
  id: contentScriptId,
  js: [contentScript],
  matches: [],
  persistAcrossSessions: true,
  allFrames: false, // only run in top frame
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
    return chrome.scripting.unregisterContentScripts({
      ids: [contentScriptId],
    })
  })

  mountConfigService.onChange(async (configs) => {
    if (!configs) return

    await handleContentScriptRegistration(configs)
  })
}

export const injectVideoScript = async (tabId: number, frameId: number) => {
  Logger.debug('Injecting player script into tab', { tabId, frameId })

  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    files: [testScript],
    world: 'ISOLATED',
  })
}
