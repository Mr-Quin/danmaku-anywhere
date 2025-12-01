import { injectable } from 'inversify'
import { Logger } from '@/common/Logger'
import { isServiceWorker } from '@/common/utils/utils'

@injectable('Singleton')
export class ReadinessService {
  private isReady = false
  private readyPromise: Promise<void>
  private resolveReady: () => void
  private logger = Logger.sub('[ReadinessService]')

  constructor() {
    const { promise, resolve } = Promise.withResolvers<void>()
    this.readyPromise = promise
    this.resolveReady = resolve

    this.init()
  }

  async waitUntilReady() {
    return this.readyPromise
  }

  setReady() {
    if (!this.isReady) {
      this.isReady = true
      this.resolveReady()
    }
  }

  private init() {
    if (isServiceWorker()) {
      this.logger.info(
        'Running in background, waiting for explicit upgrade call'
      )
      return
    }

    // In UI context, check if we need to wait
    chrome.storage.local.get('lastVersion', (result) => {
      const lastVersion = result.lastVersion
      const currentVersion = chrome.runtime.getManifest().version

      if (lastVersion === currentVersion) {
        this.logger.info('Version match, ready immediately')
        this.setReady()
      } else {
        this.logger.info(
          `Version mismatch (last: ${lastVersion}, current: ${currentVersion}), waiting for upgrade`
        )
        // Wait for storage change
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === 'local' && changes.lastVersion) {
            const newVersion = changes.lastVersion.newValue
            if (newVersion === currentVersion) {
              this.logger.info('Version updated, ready now')
              this.setReady()
            }
          }
        })
      }
    })
  }
}

export const readinessService = new ReadinessService()
