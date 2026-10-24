import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { getStorageArea } from '@/common/storage/getStorageArea'
import { tryCatch } from '@/common/utils/tryCatch'
import { isLayoutKey } from '../OptionsService/storeLayout'
import {
  type OptionStoreDescriptor,
  OptionStoreDescriptors,
} from '../optionStores'
import {
  parseStoreFailures,
  type StoreFailure,
} from '../upgrade/upgradeFailure'
import {
  failedOnThisBuild,
  STALE_RUN_MS,
  staleAt,
  UPGRADE_RUN_KEY,
} from '../upgrade/upgradeRun'
import {
  type OptionStoresStatus,
  readOptionStoresStatus,
} from './optionStoresStatus'

export type ReadinessState =
  | { status: 'pending' }
  | { status: 'ready' }
  | {
      status: 'failed'
      message: string
      stores: StoreFailure[]
      // Upgrade attempts of this build that failed in a row, 0 when none was
      // recorded
      attempts: number
    }

export interface ReadinessGate {
  waitUntilReady(): Promise<void>
}

const PENDING: ReadinessState = { status: 'pending' }
const READY: ReadinessState = { status: 'ready' }

const MAX_RETRY_DELAY_MS = 30_000

/**
 * Whether the option stores can be read in their current shape, derived in
 * every context from what is stored. It fails while a store split over several
 * items does not add up, as well as on a failed upgrade. Ready is final for the
 * context.
 */
@injectable('Singleton')
export class ReadinessService implements ReadinessGate {
  private state: ReadinessState = PENDING
  private readonly listeners = new Set<() => void>()
  private readonly ready = Promise.withResolvers<void>()
  private readonly logger: ILogger
  private observing = false
  private stopObserving: () => void = () => undefined
  private evaluating = false
  private evaluateAgain = false
  private failedReads = 0
  private retryTimer?: ReturnType<typeof setTimeout>
  private staleRunTimer?: ReturnType<typeof setTimeout>

  constructor(
    @inject(LoggerSymbol) logger: ILogger,
    @inject(OptionStoreDescriptors)
    private readonly stores: readonly OptionStoreDescriptor[]
  ) {
    this.logger = logger.sub('[ReadinessService]')
  }

  getState(): ReadinessState {
    return this.state
  }

  // Storage is watched from the first subscriber or waiter until ready.
  subscribe(listener: () => void): () => void {
    this.observe()
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // The same promise every time, so React can suspend on it. A failed upgrade
  // does not reject it: callers wait for the retry that fixes it, and the UI
  // shows the failure.
  waitUntilReady(): Promise<void> {
    this.observe()
    return this.ready.promise
  }

  private observe() {
    if (this.observing || this.state === READY) {
      return
    }
    this.observing = true

    // A store's chunk items count too: one that arrives late completes a
    // store that read as incomplete.
    const watches = (key: string) => {
      return (
        key === UPGRADE_RUN_KEY ||
        this.stores.some((store) => isLayoutKey(store, key))
      )
    }
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (Object.keys(changes).some(watches)) {
        this.scheduleEvaluation()
      }
    }
    const areas = [getStorageArea('sync'), getStorageArea('local')]
    for (const area of areas) {
      area.onChanged.addListener(onChanged)
    }
    this.stopObserving = () => {
      for (const area of areas) {
        area.onChanged.removeListener(onChanged)
      }
      clearTimeout(this.retryTimer)
      clearTimeout(this.staleRunTimer)
    }

    this.scheduleEvaluation()
  }

  private scheduleEvaluation() {
    if (this.evaluating) {
      this.evaluateAgain = true
      return
    }
    this.evaluating = true
    void this.evaluateUntilSettled()
  }

  private async evaluateUntilSettled() {
    do {
      this.evaluateAgain = false
      const [status, error] = await tryCatch(() => {
        return readOptionStoresStatus(this.stores)
      })
      if (error) {
        this.logger.error('Failed to read the option stores', error)
        this.retryLater()
      } else {
        this.failedReads = 0
        this.setState(toState(status, Date.now()))
        this.watchForStaleRun(status)
      }
    } while (this.evaluateAgain && this.state !== READY)
    this.evaluating = false
  }

  // A failed read is not followed by any change event, so without this the
  // context would stay pending.
  private retryLater() {
    this.failedReads += 1
    const delay = Math.min(
      500 * 2 ** (this.failedReads - 1),
      MAX_RETRY_DELAY_MS
    )
    clearTimeout(this.retryTimer)
    this.retryTimer = setTimeout(() => {
      this.scheduleEvaluation()
    }, delay)
  }

  // A run cut off mid-way leaves no change event behind, so the point where
  // it counts as failed is checked on a timer.
  private watchForStaleRun(status: OptionStoresStatus) {
    clearTimeout(this.staleRunTimer)
    const deadline = staleAt(status.run)
    if (status.current || deadline === undefined) {
      return
    }
    const delay = Math.min(deadline - Date.now(), STALE_RUN_MS)
    // Past the deadline the run already reads as failed, and nothing changes
    // until storage does.
    if (delay <= 0) {
      return
    }
    this.staleRunTimer = setTimeout(() => {
      this.scheduleEvaluation()
    }, delay)
  }

  private setState(next: ReadinessState) {
    if (this.state === READY || isSameState(this.state, next)) {
      return
    }
    this.state = next
    if (next === READY) {
      this.stopObserving()
      this.ready.resolve()
    }
    for (const listener of [...this.listeners]) {
      listener()
    }
  }
}

function toState(status: OptionStoresStatus, now: number): ReadinessState {
  if (status.current) {
    return READY
  }
  const run = failedOnThisBuild(status.run, now)
  const attempts = run?.attempts ?? 0
  if (status.incomplete.length > 0) {
    return {
      status: 'failed',
      message: `Incomplete option stores: ${status.incomplete.join(', ')}`,
      stores: status.incomplete.map((store) => {
        return { store, problem: 'options.incomplete' }
      }),
      attempts,
    }
  }
  if (run) {
    return {
      status: 'failed',
      message: run.message,
      stores: parseStoreFailures(run.stores),
      attempts,
    }
  }
  return PENDING
}

function isSameState(a: ReadinessState, b: ReadinessState): boolean {
  if (a.status === 'failed' && b.status === 'failed') {
    return (
      a.message === b.message &&
      a.attempts === b.attempts &&
      JSON.stringify(a.stores) === JSON.stringify(b.stores)
    )
  }
  return a.status === b.status
}
