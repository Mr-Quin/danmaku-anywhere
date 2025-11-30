import { injectable } from 'inversify'
import { Logger } from '@/common/Logger'
import type { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { isServiceWorker } from '@/common/utils/utils'

// biome-ignore lint/suspicious/noExplicitAny: generic options service
type GenericOptionsService = OptionsService<any>

@injectable('Singleton')
export class UpgradeService {
  private isReady = false
  private readyPromise: Promise<void>
  private resolveReady: () => void
  private services: GenericOptionsService[] = []
  private logger = Logger.sub('[UpgradeService]')

  constructor() {
    const { promise, resolve } = Promise.withResolvers<void>()
    this.readyPromise = promise
    this.resolveReady = resolve

    this.init()
  }

  register(service: GenericOptionsService) {
    this.services.push(service)
  }

  async waitUntilReady() {
    return this.readyPromise
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

  private setReady() {
    if (!this.isReady) {
      this.isReady = true
      this.resolveReady()
    }
  }

  async upgrade() {
    if (!isServiceWorker()) {
      throw new Error('Upgrade must be called from background script')
    }

    this.logger.info('Starting upgrade...')

    // 1. Read all data
    const context: Record<string, unknown> = {}
    for (const service of this.services) {
      // Use internal read to bypass lock
      const data = await service.readInternal()
      if (data) {
        context[service.key] = data.data
      }
    }

    // 2. Upgrade each service
    for (const service of this.services) {
      await service.upgrade(context)
    }

    // 3. Update version marker
    const currentVersion = chrome.runtime.getManifest().version
    await chrome.storage.local.set({ lastVersion: currentVersion })

    this.logger.info(`Upgrade complete. Version set to ${currentVersion}`)
    this.setReady()
  }
}

export const upgradeService = new UpgradeService()
