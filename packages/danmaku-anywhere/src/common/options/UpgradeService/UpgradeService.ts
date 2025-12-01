import { inject, injectable, multiInject } from 'inversify'
import { Logger } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { readinessService } from '@/common/options/ReadinessService/ReadinessService'
import { isServiceWorker } from '@/common/utils/utils'

@injectable('Singleton')
export class UpgradeService {
  private logger = Logger.sub('[UpgradeService]')

  constructor(
    @multiInject(StoreServiceSymbol) private services: IStoreService[]
  ) {}

  async waitUntilReady() {
    return readinessService.waitUntilReady()
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
      const data = await service.options.readInternal()
      if (data) {
        context[service.options.key] = data.data
      }
    }

    // 2. Upgrade each service
    for (const service of this.services) {
      await service.options.upgrade(context)
    }

    // 3. Update version marker
    const currentVersion = chrome.runtime.getManifest().version
    await chrome.storage.local.set({ lastVersion: currentVersion })

    this.logger.info(`Upgrade complete. Version set to ${currentVersion}`)
    readinessService.setReady()
  }
}
