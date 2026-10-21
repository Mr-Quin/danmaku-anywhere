import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { getStorageArea } from '@/common/storage/getStorageArea'
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
  startedRun,
  UPGRADE_RUN_KEY,
  type UpgradeRun,
} from './upgradeRun'

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
      if (run) {
        await this.clearRunState()
      }
      return
    }
    if (!canRetryAutomatically(run, Date.now())) {
      return
    }
    return this.start(true)
  }

  upgrade(): Promise<void> {
    return this.start(false)
  }

  private start(automatic: boolean): Promise<void> {
    // Two standalone tabs each have this service over the same localStorage,
    // so runs are serialized across tabs, not just within this one. A tab
    // that waited for the lock checks again, since the other tab's run may
    // have upgraded the stores or counted a failure.
    this.running ??= navigator.locks
      .request('options-upgrade', async () => {
        if (automatic && !(await this.mayRunAutomatically())) {
          return
        }
        return this.run()
      })
      .finally(() => {
        this.running = undefined
      })
    return this.running
  }

  private async mayRunAutomatically(): Promise<boolean> {
    const { current, run } = await readOptionStoresStatus(this.descriptors)
    return !current && canRetryAutomatically(run, Date.now())
  }

  private async run(): Promise<void> {
    this.logger.debug('Starting upgrade')
    let started = startedRun(undefined, Date.now())
    const [, error] = await tryCatch(async () => {
      started = startedRun(await this.runRecord.read(), Date.now())
      await this.runRecord.set(started)
      await upgradeStores(this.stores, this.logger)
    })
    if (error) {
      this.logger.error('Options upgrade failed', error)
      await this.recordFailure(started, error)
      throw error
    }

    await this.clearRunState()
    this.logger.debug('Upgrade complete')
  }

  private async clearRunState() {
    const [, error] = await tryCatch(() => {
      return getStorageArea('local').remove([
        UPGRADE_RUN_KEY,
        LEGACY_VERSION_KEY,
      ])
    })
    if (error) {
      this.logger.error('Failed to clear the upgrade run state', error)
    }
  }

  private async recordFailure(started: UpgradeRun, error: Error) {
    const [, recordError] = await tryCatch(() => {
      return this.runRecord.set({
        status: 'failed',
        build: started.build,
        attempts: started.attempts,
        failedAt: Date.now(),
        message: error.message,
      })
    })
    if (recordError) {
      this.logger.error('Failed to record the upgrade failure', recordError)
    }
  }
}
