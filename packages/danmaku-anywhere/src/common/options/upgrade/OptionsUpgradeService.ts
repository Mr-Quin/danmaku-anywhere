import { inject, injectable, multiInject } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { tryCatch } from '@/common/utils/tryCatch'
import { type IStoreService, StoreServiceSymbol } from '../IStoreService'
import { ReadinessService } from '../ReadinessService/ReadinessService'
import { upgradeStores } from '../upgradeStores'
import type { OptionsUpgrader } from './OptionsUpgrader'

// Runs the option store upgrade in the context that owns the stores: the
// service worker, or the page itself in the standalone build.
@injectable('Singleton')
export class OptionsUpgradeService implements OptionsUpgrader {
  private readonly logger: ILogger
  private running?: Promise<void>

  constructor(
    @multiInject(StoreServiceSymbol)
    private readonly stores: IStoreService[],
    @inject(ReadinessService)
    private readonly readiness: ReadinessService,
    @inject(LoggerSymbol)
    logger: ILogger
  ) {
    this.logger = logger.sub('[OptionsUpgradeService]')
  }

  async ensureUpgraded(): Promise<void> {
    if (this.readiness.getState().status === 'ready') {
      return
    }
    return this.upgrade()
  }

  upgrade(): Promise<void> {
    this.running ??= this.run().finally(() => {
      this.running = undefined
    })
    return this.running
  }

  private async run(): Promise<void> {
    this.logger.debug('Starting upgrade')
    const [, error] = await tryCatch(() => {
      return upgradeStores(this.stores, this.logger)
    })
    if (error) {
      this.logger.error('Options upgrade failed', error)
      const [, recordError] = await tryCatch(() => {
        return this.readiness.recordFailure(error)
      })
      if (recordError) {
        this.logger.error('Failed to record the upgrade failure', recordError)
      }
      throw error
    }
    await this.readiness.clearFailure()
    this.logger.debug('Upgrade complete')
  }
}
