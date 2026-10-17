import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { MountConfigService } from '@/common/options/mountConfig/service'
import { createTaskQueue } from '@/common/utils/taskQueue'
// the ?script query is used to get the file path for the script after bundling
// @ts-expect-error
import contentScript from '@/content/controller?script'

export const MAIN_CONTENT_SCRIPT_ID = 'main-content'

const mainScript: chrome.scripting.RegisteredContentScript = {
  id: MAIN_CONTENT_SCRIPT_ID,
  js: [contentScript],
  matches: [],
  persistAcrossSessions: true,
  allFrames: false, // only run in top frame
  runAt: 'document_idle',
  world: 'ISOLATED',
}

const q = createTaskQueue()

function isSameList(a: string[] | undefined, b: string[]) {
  if (!a || a.length !== b.length) {
    return false
  }
  return a.every((item, i) => {
    return item === b[i]
  })
}

@injectable('Singleton')
export class ScriptingManager {
  private logger: ILogger

  constructor(
    @inject(MountConfigService)
    private mountConfigService: MountConfigService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[ScriptingManager]')
  }

  setup() {
    this.mountConfigService.options.onChange(async (configs) => {
      if (!configs) {
        return
      }

      await q.run(() => this.handleContentScriptRegistration(configs))
    })

    // An update can drop the registration or leave it pointing at the
    // previous build's script without any mount config changing.
    this.syncWithStoredConfigs().catch((err) => {
      this.logger.error('Failed to sync content script registration', err)
    })
  }

  // Read inside the queue so this cannot overwrite a newer change with an
  // older read.
  private syncWithStoredConfigs() {
    return q.run(async () => {
      const configs = await this.mountConfigService.getAll()
      return this.handleContentScriptRegistration(configs)
    })
  }

  private async handleContentScriptRegistration(mountConfigs: MountConfig[]) {
    const patterns = mountConfigs
      // only register enabled configs
      .filter((configs) => configs.enabled)
      .map((config) => config.patterns)
      .flat()

    const [registered] = await chrome.scripting.getRegisteredContentScripts({
      ids: [MAIN_CONTENT_SCRIPT_ID],
    })

    if (patterns.length === 0) {
      if (registered) {
        this.logger.debug('Unregistering content scripts', { patterns })
        await chrome.scripting.unregisterContentScripts({
          ids: [MAIN_CONTENT_SCRIPT_ID],
        })
      }
      return
    }

    if (!registered) {
      this.logger.debug('Registering content scripts', { patterns })
      await chrome.scripting.registerContentScripts([
        {
          ...mainScript,
          matches: patterns,
        },
      ])
      return
    }

    if (
      isSameList(registered.js, [contentScript]) &&
      isSameList(registered.matches, patterns)
    ) {
      return
    }

    this.logger.debug('Updating content scripts', { patterns })
    await chrome.scripting.updateContentScripts([
      {
        id: MAIN_CONTENT_SCRIPT_ID,
        js: [contentScript],
        matches: patterns,
      },
    ])
  }
}
