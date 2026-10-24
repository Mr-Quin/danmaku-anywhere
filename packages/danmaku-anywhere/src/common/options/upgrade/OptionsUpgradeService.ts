import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { tryCatch } from '@/common/utils/tryCatch'
import { getRandomUUID } from '@/common/utils/utils'
import { type IStoreService, UpgradableOptionStores } from '../IStoreService'
import {
  type OptionStoreDescriptor,
  OptionStoreDescriptors,
} from '../optionStores'
import { readOptionStoresStatus } from '../ReadinessService/optionStoresStatus'
import { upgradeStores } from '../upgradeStores'
import type { OptionsUpgrader } from './OptionsUpgrader'
import {
  MAX_RECOVERY_COPIES,
  OPTIONS_RECOVERY_KEY,
  type OptionsRecoveryCopy,
} from './recoveryCopy'
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
  private readonly recovery = new ExtStorageService<OptionsRecoveryCopy[]>(
    OPTIONS_RECOVERY_KEY,
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

  saveRecoveryCopy(key: string): Promise<OptionsRecoveryCopy> {
    const service = this.findStore(key)
    return navigator.locks.request('options-upgrade', () => {
      return this.saveCopy(service)
    })
  }

  // Refuses unless the copy saved for this reset is still kept, so a store
  // is never reset without its data being saved first.
  async resetStore(key: string, copyId: string): Promise<void> {
    const service = this.findStore(key)
    await navigator.locks.request('options-upgrade', async () => {
      const copies = (await this.recovery.read()) ?? []
      const saved = copies.some((copy) => {
        return copy.id === copyId && copy.store === key
      })
      if (!saved) {
        throw new Error(`No recovery copy ${copyId} of ${key} to reset from`)
      }
      await this.reset(service)
    })
    const [, error] = await tryCatch(() => this.upgrade())
    if (error) {
      this.logger.debug('The upgrade still fails after the reset', error)
    }
  }

  private findStore(key: string): IStoreService {
    const service = this.stores.find((store) => store.options.key === key)
    if (!service) {
      throw new Error(`Unknown option store: ${key}`)
    }
    return service
  }

  // A store split over items that do not add up cannot be read as one
  // envelope, so its raw items are kept instead.
  private async saveCopy(service: IStoreService): Promise<OptionsRecoveryCopy> {
    const { options } = service
    const savedAt = Date.now()
    const copy: OptionsRecoveryCopy = {
      id: `${options.key}-${savedAt}-${getRandomUUID()}`,
      store: options.key,
      savedAt,
    }
    const [envelope, readError] = await tryCatch(() => {
      return options.readStoredUnblocked()
    })
    if (readError) {
      copy.items = await options.readRawUnblocked()
    } else {
      copy.envelope = envelope
    }
    const copies = (await this.recovery.read()) ?? []
    await this.recovery.set([...copies, copy].slice(-MAX_RECOVERY_COPIES))
    return copy
  }

  private async reset(service: IStoreService): Promise<void> {
    const { options } = service
    this.logger.debug(`Resetting ${options.key}`)
    await options.resetUnblocked()
    await service.afterReset?.()
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
