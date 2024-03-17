import { mountConfigService } from './syncOptions/upgradeOptions'

import { defaultMountConfig } from '@/common/constants/mountConfig'
// @ts-expect-error
// eslint-disable-next-line import/no-restricted-paths, import/default
import contentScript from '@/content/index?script'

const contentScriptId = 'main-content'

export const setupScripting = () => {
  const scripts: chrome.scripting.RegisteredContentScript[] = [
    {
      id: contentScriptId,
      js: [contentScript],
      matches: defaultMountConfig.map((config) => config.patterns).flat(),
      persistAcrossSessions: true,
      allFrames: true,
      runAt: 'document_idle',
      world: 'ISOLATED',
    },
  ]

  chrome.scripting.registerContentScripts(scripts)

  mountConfigService.onChange(async (configs) => {
    if (!configs) return

    chrome.scripting.updateContentScripts([
      {
        id: contentScriptId,
        matches: configs.map((config) => config.patterns).flat(),
      },
    ])
  })
}
