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
      // Use internal read to bypass lock
      const data = await service.options.readInternal()
      if (data) {
        context[service.options.key] = data.data
      }
    }

    // upgrade each service
    for (const service of this.services) {
      await service.options.upgrade(context)
    }

    // mark as ready
    const currentVersion = chrome.runtime.getManifest().version
    await this.readinessService.setVersion(currentVersion)

    this.logger.debug(`Upgrade complete. Version set to ${currentVersion}`)
    this.readinessService.setReady()
  }
}
