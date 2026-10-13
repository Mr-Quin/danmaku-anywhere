import { inject, injectable } from 'inversify'
import { type ILogger, LoggerSymbol } from '@/common/Logger'
import { ExtStorageService } from '@/common/storage/ExtStorageService'
import { tryCatch } from '@/common/utils/tryCatch'
import {
  type IOptionStoresProvider,
  type IStoreService,
  OptionStoresProvider,
} from '../IStoreService'

export type ReadinessState =
  | { status: 'pending' }
  | { status: 'ready' }
  | { status: 'failed'; message: string }

interface UpgradeFailure {
  message: string
}

const PENDING: ReadinessState = { status: 'pending' }
const READY: ReadinessState = { status: 'ready' }

/**
 * Whether the option stores can be read in their current shape. The state is
 * derived in every context from what is stored: ready once each store is at
 * its latest version, failed while the last upgrade attempt left a failure
 * record, and pending otherwise. Ready is final for the context.
 */
@injectable('Singleton')
export class ReadinessService {
  private state: ReadinessState = PENDING
  private readonly listeners = new Set<() => void>()
  private readonly failure = new ExtStorageService<UpgradeFailure>(
    'optionsUpgradeFailure',
    { storageType: 'local' }
  )
  private readonly logger: ILogger
  private stores: IStoreService[] = []
  private stopObservingStores: (() => void)[] = []
  private started = false
  private evaluating = false
  private evaluateAgain = false

  constructor(
    @inject(LoggerSymbol) logger: ILogger,
    @inject(OptionStoresProvider)
    private readonly getStores: IOptionStoresProvider
  ) {
    this.logger = logger.sub('[ReadinessService]')
  }

  getState(): ReadinessState {
    this.start()
    return this.state
  }

  subscribe(listener: () => void): () => void {
    this.start()
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Resolves once the stores are ready. A failed upgrade does not reject:
  // callers wait for the retry that fixes it, and the UI shows the failure.
  waitUntilReady(): Promise<void> {
    if (this.getState().status === 'ready') {
      return Promise.resolve()
    }
    const { promise, resolve } = Promise.withResolvers<void>()
    const unsubscribe = this.subscribe(() => {
      if (this.state.status === 'ready') {
        unsubscribe()
        resolve()
      }
    })
    return promise
  }

  recordFailure(error: Error): Promise<void> {
    return this.failure.set({ message: error.message })
  }

  clearFailure(): Promise<void> {
    return this.failure.delete()
  }

  private start() {
    if (this.started) {
      return
    }
    this.started = true
    // A store can wait on this service from its own constructor. Resolving
    // the stores in that same call stack would construct that store again.
    queueMicrotask(() => {
      this.observe()
    })
  }

  private observe() {
    try {
      this.stores = this.getStores()
    } catch (error) {
      this.logger.error('Failed to resolve the option stores', error)
      return
    }
    // Subscribe before the first read, or a write landing between the two is
    // never seen.
    this.stopObservingStores = this.stores.map((store) => {
      return store.options.onChange(() => {
        this.scheduleEvaluation()
      })
    })
    this.failure.subscribe(() => {
      this.scheduleEvaluation()
    })
    this.failure.setup()
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
      const [next, error] = await tryCatch(() => this.evaluate())
      if (error) {
        this.logger.error('Failed to read the option stores', error)
      } else {
        this.setState(next)
      }
    } while (this.evaluateAgain && this.state !== READY)
    this.evaluating = false
  }

  private async evaluate(): Promise<ReadinessState> {
    const current = await Promise.all(
      this.stores.map((store) => store.options.isCurrent())
    )
    if (current.every(Boolean)) {
      return READY
    }
    const failure = await this.failure.read()
    if (failure) {
      return { status: 'failed', message: failure.message }
    }
    return PENDING
  }

  private setState(next: ReadinessState) {
    if (this.state === READY || isSameState(this.state, next)) {
      return
    }
    this.state = next
    if (next === READY) {
      this.stopObserving()
    }
    for (const listener of [...this.listeners]) {
      listener()
    }
  }

  private stopObserving() {
    for (const stop of this.stopObservingStores) {
      stop()
    }
    this.stopObservingStores = []
    this.failure.destroy()
  }
}

function isSameState(a: ReadinessState, b: ReadinessState): boolean {
  if (a.status === 'failed' && b.status === 'failed') {
    return a.message === b.message
  }
  return a.status === b.status
}
