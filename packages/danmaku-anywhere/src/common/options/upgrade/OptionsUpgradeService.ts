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
import { type UpgradeSnapshot, upgradeStores } from '../upgradeStores'
import type { OptionsUpgrader } from './OptionsUpgrader'
import { OPTIONS_RECOVERY_KEY, type OptionsRecoveryCopy } from './recoveryCopy'
import { storeFailuresOf } from './upgradeFailure'
import {
  canRetryAutomatically,
  UPGRADE_RUN_KEY,
  UPGRADE_SNAPSHOT_KEY,
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
  private readonly snapshot = new ExtStorageService<UpgradeSnapshot>(
    UPGRADE_SNAPSHOT_KEY,
    { storageType: 'local' }
  )
  private readonly recovery = new ExtStorageService<
    Record<string, OptionsRecoveryCopy>
  >(OPTIONS_RECOVERY_KEY, { storageType: 'local' })
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
    if (run && !canRetryAutomatically(run, Date.now())) {
      return
    }
    return this.upgrade()
  }

  upgrade(): Promise<void> {
    return this.start(false)
  }

  // A new build may fix what made the earlier attempts fail, so it starts
  // counting attempts again. A snapshot from a partial earlier attempt is
  // still the data from before the upgrade, so it is kept.
  upgradeForNewBuild(): Promise<void> {
    return this.start(true)
  }

  async resetStore(key: string): Promise<OptionsRecoveryCopy> {
    const service = this.stores.find((store) => store.options.key === key)
    if (!service) {
      throw new Error(`Unknown option store: ${key}`)
    }
    const copy = await navigator.locks.request('options-upgrade', () => {
      return this.reset(service)
    })
    const [, error] = await tryCatch(() => this.upgrade())
    if (error) {
      this.logger.debug('The upgrade still fails after the reset', error)
    }
    return copy
  }

  // The copy is saved before anything is reset. The store's entry in the
  // snapshot becomes the defaults, so the other stores' steps no longer see
  // the data the user chose to drop.
  private async reset(service: IStoreService): Promise<OptionsRecoveryCopy> {
    const { options } = service
    const copy: OptionsRecoveryCopy = {
      store: options.key,
      savedAt: Date.now(),
      items: await options.readRawUnblocked(),
    }
    const saved = await this.recovery.read()
    await this.recovery.set({ ...saved, [options.key]: copy })
    this.logger.debug(`Resetting ${options.key}`)
    await options.resetUnblocked()
    await service.afterReset?.()

    const snapshot = await this.snapshot.read()
    if (snapshot?.[options.key]) {
      await this.snapshot.set({
        ...snapshot,
        [options.key]: {
          stored: await options.readStoredUnblocked(),
          target: options.latestVersion,
        },
      })
    }
    return copy
  }

  private start(newBuild: boolean): Promise<void> {
    // Two standalone tabs each have this service over the same localStorage,
    // so runs are serialized across tabs, not just within this one.
    this.running ??= navigator.locks
      .request('options-upgrade', () => {
        return this.run(newBuild)
      })
      .finally(() => {
        this.running = undefined
      })
    return this.running
  }

  private async run(newBuild: boolean): Promise<void> {
    this.logger.debug('Starting upgrade')
    const previous = await this.runRecord.read()
    const attempts = (newBuild || !previous ? 0 : previous.attempts) + 1
    // A snapshot only belongs to an attempt that has not succeeded yet.
    const kept = previous ? await this.snapshot.read() : undefined
    await this.runRecord.set({
      status: 'running',
      attempts,
      startedAt: Date.now(),
    })

    const [, error] = await tryCatch(() => {
      return upgradeStores(this.stores, this.logger, {
        kept,
        save: (snapshot) => this.snapshot.set(snapshot),
      })
    })
    if (error) {
      this.logger.error('Options upgrade failed', error)
      await this.recordFailure(attempts, error)
      throw error
    }

    await this.clearRunState()
    this.logger.debug('Upgrade complete')
  }

  // One call, so the snapshot never outlives the record that says its
  // attempt has not succeeded.
  private async clearRunState() {
    const [, error] = await tryCatch(() => {
      return getStorageArea('local').remove([
        UPGRADE_RUN_KEY,
        UPGRADE_SNAPSHOT_KEY,
        LEGACY_VERSION_KEY,
      ])
    })
    if (error) {
      this.logger.error('Failed to clear the upgrade run state', error)
    }
  }

  private async recordFailure(attempts: number, error: Error) {
    const [, recordError] = await tryCatch(() => {
      return this.runRecord.set({
        status: 'failed',
        attempts,
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
