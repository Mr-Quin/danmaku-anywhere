import { inject, injectable, multiInject } from 'inversify'
import { getExtensionVersion } from '@/common/environment/chromeRuntime'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'

@injectable('Singleton')
export class StandaloneUpgradeService {
  private logger: ILogger

  constructor(
    @multiInject(StoreServiceSymbol) private services: IStoreService[],
    @inject(ReadinessService)
    private readinessService: ReadinessService,
    @inject(LoggerSymbol)
    logger: ILogger
  ) {
    this.logger = logger.sub('[StandaloneUpgradeService]')
  }

  async waitUntilReady() {
    return this.readinessService.waitUntilReady()
  }

  async upgrade() {
    this.logger.debug('Starting standalone upgrade...')

    const context: Record<string, unknown> = {}
    for (const service of this.services) {
      const data = await service.options.readUnblocked()
      if (data) {
        context[service.options.key] = data
      }
    }

    for (const service of this.services) {
      try {
        await service.options.upgrade(context)
      } catch (error) {
        this.logger.error(`Failed to upgrade ${service.options.key}`, error)
      }
    }

    const currentVersion = getExtensionVersion()
    await this.readinessService.setVersion(currentVersion)

    this.logger.debug(`Upgrade complete. Version set to ${currentVersion}`)
    this.readinessService.setReady()
  }
}
