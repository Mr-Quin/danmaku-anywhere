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
import { storeFailuresOf } from './upgradeFailure'
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
    const [status, error] = await tryCatch(() => {
      return readOptionStoresStatus(this.descriptors)
    })
    // Without a status the run itself decides, and records a failure if
    // storage stays unreadable, instead of leaving readiness pending.
    if (error) {
      this.logger.error('Failed to read the option stores', error)
      return this.start(true)
    }
    if (status.current) {
      if (status.run) {
        await this.clearRunState()
      }
      return
    }
    if (!canRetryAutomatically(status.run, Date.now())) {
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

  // When the stores cannot be read, the run record alone still applies the
  // attempt cap and the backoff.
  private async mayRunAutomatically(): Promise<boolean> {
    const [status] = await tryCatch(() => {
      return readOptionStoresStatus(this.descriptors)
    })
    if (status) {
      return !status.current && canRetryAutomatically(status.run, Date.now())
    }
    const [run, error] = await tryCatch(() => this.runRecord.read())
    if (error) {
      return true
    }
    return canRetryAutomatically(run ?? undefined, Date.now())
  }

  private async run(): Promise<void> {
    this.logger.debug('Starting upgrade')
    let started: UpgradeRun | undefined
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

  // Without the running record of this attempt, its count comes from what is
  // stored, so a read error does not restart the count at one.
  private async recordFailure(started: UpgradeRun | undefined, error: Error) {
    const [, recordError] = await tryCatch(async () => {
      const attempt =
        started ?? startedRun(await this.runRecord.read(), Date.now())
      return this.runRecord.set({
        status: 'failed',
        build: attempt.build,
        attempts: attempt.attempts,
        failedAt: Date.now(),
        message: error.message,
        stores: storeFailuresOf(error),
      })
    })
    if (recordError) {
      this.logger.error('Failed to record the upgrade failure', recordError)
    }
  }
}
