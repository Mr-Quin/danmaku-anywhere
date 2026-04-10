import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { MountConfigService } from '@/common/options/mountConfig/service'

/**
 * When the user adds a new mount config (or enables an existing one), existing
 * tabs that match the new patterns do not automatically get the freshly
 * registered content script — `chrome.scripting.registerContentScripts` only
 * affects future navigations. This manager diffs mount config changes and
 * reloads any open tabs that newly match, so the user doesn't have to refresh
 * manually.
 */
@injectable('Singleton')
export class MountConfigTabReloader {
  private logger: ILogger
  private previousEnabledPatterns = new Set<string>()
  private initialized = false

  constructor(
    @inject(MountConfigService)
    private mountConfigService: MountConfigService,
    @inject(LoggerSymbol) logger: ILogger
  ) {
    this.logger = logger.sub('[MountConfigTabReloader]')
  }

  setup() {
    // Register the change listener first so we don't miss events that arrive
    // while the initial getAll() is still in flight. Whichever of the two
    // completes first seeds `previousEnabledPatterns`; the other is a no-op
    // guarded by `initialized`.
    this.mountConfigService.options.onChange(async (configs) => {
      if (!configs) {
        return
      }
      await this.handleConfigChange(configs)
    })

    void this.initializePreviousPatterns()
  }

  private async initializePreviousPatterns() {
    const configs = await this.mountConfigService.getAll()
    if (this.initialized) {
      // An onChange already seeded us with fresher data — don't overwrite.
      return
    }
    this.previousEnabledPatterns = collectEnabledPatterns(configs)
    this.initialized = true
  }

  private async handleConfigChange(configs: MountConfig[]) {
    // Skip the first change event before our baseline is ready, otherwise we
    // would treat every existing pattern as newly-added on startup.
    if (!this.initialized) {
      this.previousEnabledPatterns = collectEnabledPatterns(configs)
      this.initialized = true
      return
    }

    const nextPatterns = collectEnabledPatterns(configs)
    const addedPatterns: string[] = []
    for (const pattern of nextPatterns) {
      if (!this.previousEnabledPatterns.has(pattern)) {
        addedPatterns.push(pattern)
      }
    }
    this.previousEnabledPatterns = nextPatterns

    if (addedPatterns.length === 0) {
      return
    }

    await this.reloadTabsMatching(addedPatterns)
  }

  private async reloadTabsMatching(patterns: string[]) {
    let tabs: chrome.tabs.Tab[]
    try {
      // chrome.tabs.query accepts a string array, deduping matches for us.
      tabs = await chrome.tabs.query({ url: patterns })
    } catch (error) {
      this.logger.debug('Failed to query tabs for patterns', {
        patterns,
        error,
      })
      return
    }

    for (const tab of tabs) {
      if (tab.id === undefined) {
        continue
      }
      this.logger.debug('Reloading tab', { tabId: tab.id, url: tab.url })
      try {
        await chrome.tabs.reload(tab.id)
      } catch (error) {
        this.logger.debug('Failed to reload tab', { tabId: tab.id, error })
      }
    }
  }
}

function collectEnabledPatterns(configs: MountConfig[]): Set<string> {
  const patterns = new Set<string>()
  for (const config of configs) {
    if (!config.enabled) {
      continue
    }
    for (const pattern of config.patterns) {
      patterns.add(pattern)
    }
  }
  return patterns
}
