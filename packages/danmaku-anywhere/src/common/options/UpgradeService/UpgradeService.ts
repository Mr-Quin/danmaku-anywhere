import { inject, injectable, multiInject } from 'inversify'
import { Logger } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { isServiceWorker } from '@/common/utils/utils'

@injectable('Singleton')
export class UpgradeService {
  private logger = Logger.sub('[UpgradeService]')

  constructor(
    @multiInject(StoreServiceSymbol) private services: IStoreService[],
    @inject(ReadinessService)
    private readinessService: ReadinessService
  ) {}

  async waitUntilReady() {
    return this.readinessService.waitUntilReady()
  }

  async upgrade() {
    if (!isServiceWorker()) {
      throw new Error('Upgrade must be called from background script')
    }

    this.logger.debug('Starting upgrade...')

    // gather context
    const context: Record<string, unknown> = {}
    for (const service of this.services) {
      // special method to read without waiting for readiness
      const data = await service.options.readUnblocked()
      if (data) {
        context[service.options.key] = data
      }
    }

    // upgrade each service
    for (const service of this.services) {
      try {
        await service.options.upgrade(context)
      } catch (error) {
        this.logger.error(`Failed to upgrade ${service.options.key}`, error)
      }
    }

    // mark as ready
    const currentVersion = chrome.runtime.getManifest().version
    await this.readinessService.setVersion(currentVersion)

    this.logger.debug(`Upgrade complete. Version set to ${currentVersion}`)
    this.readinessService.setReady()
  }
}
