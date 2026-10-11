import { inject, injectable, multiInject } from 'inversify'
import { EXTENSION_VERSION } from '@/common/constants'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import type { UpgradeContext } from '@/common/options/OptionsService/types'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { isServiceWorker } from '@/common/utils/utils'

@injectable('Singleton')
export class UpgradeService {
  private logger: ILogger

  constructor(
    @multiInject(StoreServiceSymbol) private services: IStoreService[],
    @inject(ReadinessService)
    private readinessService: ReadinessService,
    @inject(LoggerSymbol)
    logger: ILogger
  ) {
    this.logger = logger.sub('[UpgradeService]')
  }

  async waitUntilReady() {
    return this.readinessService.waitUntilReady()
  }

  async upgrade() {
    if (!isServiceWorker()) {
      throw new Error('Upgrade must be called from background script')
    }

    this.logger.debug('Starting upgrade...')

    const context: UpgradeContext = {}
    for (const service of this.services) {
      const stored = await service.options.readStoredUnblocked()
      if (stored) {
        context[service.options.key] = stored.data
      }
    }

    const errors: unknown[] = []
    const failed: string[] = []
    for (const service of this.services) {
      try {
        await service.options.upgrade(context)
      } catch (error) {
        this.logger.error(`Failed to upgrade ${service.options.key}`, error)
        errors.push(error)
        failed.push(service.options.key)
      }
    }

    // lastVersion is what tells the next start that the upgrade is done, so a
    // store that did not persist must leave it behind for a retry.
    if (failed.length > 0) {
      throw new AggregateError(
        errors,
        `Failed to upgrade options: ${failed.join(', ')}`
      )
    }

    const currentVersion = EXTENSION_VERSION
    await this.readinessService.setVersion(currentVersion)

    this.logger.debug(`Upgrade complete. Version set to ${currentVersion}`)
    this.readinessService.setReady()
  }
}
