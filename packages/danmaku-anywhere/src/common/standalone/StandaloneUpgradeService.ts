import { inject, injectable, multiInject } from 'inversify'
import { EXTENSION_VERSION } from '@/common/constants'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import {
  type IStoreService,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { upgradeStores } from '@/common/options/upgradeStores'

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

    await upgradeStores(this.services, this.logger)

    const currentVersion = EXTENSION_VERSION
    await this.readinessService.setVersion(currentVersion)

    this.logger.debug(`Upgrade complete. Version set to ${currentVersion}`)
    this.readinessService.setReady()
  }
}
