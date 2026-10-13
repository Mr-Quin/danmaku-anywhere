import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { tryCatch } from '@/common/utils/tryCatch'
import { type IStoreService, UpgradableOptionStores } from '../IStoreService'
import {
  type OptionStoreDescriptor,
  OptionStoreDescriptors,
} from '../optionStores'
import { readOptionStoresStatus } from '../ReadinessService/optionStoresStatus'
import { upgradeStores } from '../upgradeStores'
import type { OptionsUpgrader } from './OptionsUpgrader'
import {
  canRetryAutomatically,
  UPGRADE_RUN_KEY,
  type UpgradeRun,
} from './upgradeRun'

// Builds before per-store readiness kept a version marker under this key.
const LEGACY_VERSION_KEY = 'lastVersion'

// Runs the option store upgrade in the context that owns the stores: the
// service worker, or the page itself in the standalone build.
@injectable('Singleton')
export class OptionsUpgradeService implements OptionsUpgrader {
  private readonly logger: ILogger
  private readonly runRecord = new ExtStorageService<UpgradeRun>(
    UPGRADE_RUN_KEY,
    { storageType: 'local' }
  )
  private readonly legacyVersion = new ExtStorageService<unknown>(
    LEGACY_VERSION_KEY,
    { storageType: 'local' }
  )
  private running?: Promise<void>

  constructor(
    @inject(UpgradableOptionStores)
    private readonly stores: IStoreService[],
    @inject(OptionStoreDescriptors)
    private readonly descriptors: readonly OptionStoreDescriptor[],
    @inject(LoggerSymbol)
    logger: ILogger
  ) {
    this.logger = logger.sub('[OptionsUpgradeService]')
  }

  async ensureUpgraded(): Promise<void> {
    if (this.running) {
      return this.running
    }
    const { current, run } = await readOptionStoresStatus(this.descriptors)
    if (current) {
      return
    }
    if (run && !canRetryAutomatically(run, Date.now())) {
      return
    }
    return this.upgrade()
  }

  upgrade(): Promise<void> {
    // Two standalone tabs each have this service over the same localStorage,
    // so runs are serialized across tabs, not just within this one.
    this.running ??= navigator.locks
      .request('options-upgrade', () => {
        return this.run()
      })
      .finally(() => {
        this.running = undefined
      })
    return this.running
  }

  private async run(): Promise<void> {
    this.logger.debug('Starting upgrade')
    const previous = await this.runRecord.read()
    const attempts = previous?.attempts ?? 0
    await this.runRecord.set({ status: 'running', attempts })

    const [, error] = await tryCatch(() => {
      return upgradeStores(this.stores, this.logger)
    })
    if (error) {
      this.logger.error('Options upgrade failed', error)
      await this.recordFailure(attempts + 1, error)
      throw error
    }

    await this.runRecord.delete()
    await this.legacyVersion.delete()
    this.logger.debug('Upgrade complete')
  }

  private async recordFailure(attempts: number, error: Error) {
    const [, recordError] = await tryCatch(() => {
      return this.runRecord.set({
        status: 'failed',
        attempts,
        failedAt: Date.now(),
        message: error.message,
      })
    })
    if (recordError) {
      this.logger.error('Failed to record the upgrade failure', recordError)
    }
  }
}
