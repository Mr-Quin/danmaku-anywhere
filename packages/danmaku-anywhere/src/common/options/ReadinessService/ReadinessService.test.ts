import { fakeBrowser } from '@webext-core/fake-browser'
import { Container, inject, injectable } from 'inversify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import {
  type IOptionStoresProvider,
  type IStoreService,
  OptionStoresProvider,
  StoreServiceSymbol,
} from '@/common/options/IStoreService'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'
import { silentLogger } from '@/tests/silentLogger'
import { ReadinessService } from './ReadinessService'

/**
 * ReadinessService is ready once every option store is stored at its latest
 * version, whichever context wrote them. Until then it is failed while a
 * failure record from the last upgrade attempt exists and pending otherwise.
 * Waiters keep waiting through a failure and resolve when a retry succeeds.
 * Ready is final for the lifetime of the context.
 */

const alwaysReady = { waitUntilReady: () => Promise.resolve() }

function createStore(key: string): IStoreService {
  const options = new OptionsService<{ value: string }>(
    alwaysReady,
    key,
    { value: 'default' },
    silentLogger,
    'local'
  )
    .version(1, { upgrade: (data) => data })
    .version(2, { upgrade: (data) => data })
  return { name: key, options }
}

function storeAt(key: string, version: number) {
  return fakeBrowser.storage.local.set({
    [key]: { data: { value: 'stored' }, version },
  })
}

function createReadiness(stores: IStoreService[]) {
  const container = new Container()
  container.bind(ReadinessService).toSelf().inSingletonScope()
  container.bind(LoggerSymbol).toConstantValue(silentLogger)
  container
    .bind<IOptionStoresProvider>(OptionStoresProvider)
    .toConstantValue(() => stores)
  return container.get(ReadinessService)
}

async function settledState(readiness: ReadinessService) {
  readiness.getState()
  await new Promise((resolve) => setTimeout(resolve, 0))
  return readiness.getState()
}

describe('ReadinessService', () => {
  let alpha: IStoreService
  let beta: IStoreService

  beforeEach(() => {
    alpha = createStore('alpha')
    beta = createStore('beta')
  })

  it('is ready when every store is at its latest version', async () => {
    await storeAt('alpha', 2)
    await storeAt('beta', 2)
    const readiness = createReadiness([alpha, beta])

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
    expect(readiness.getState()).toEqual({ status: 'ready' })
  })

  it('is pending while a store is behind and ready once it is upgraded', async () => {
    await storeAt('alpha', 2)
    await storeAt('beta', 1)
    const readiness = createReadiness([alpha, beta])
    let isReady = false
    void readiness.waitUntilReady().then(() => {
      isReady = true
    })

    expect(await settledState(readiness)).toEqual({ status: 'pending' })
    expect(isReady).toBe(false)

    await beta.options.upgrade()

    await vi.waitFor(() => {
      expect(isReady).toBe(true)
    })
    expect(readiness.getState()).toEqual({ status: 'ready' })
  })

  it('is pending while a store has never been written', async () => {
    await storeAt('alpha', 2)
    const readiness = createReadiness([alpha, beta])

    expect(await settledState(readiness)).toEqual({ status: 'pending' })
  })

  it('reports the recorded failure while a store is behind', async () => {
    await storeAt('alpha', 1)
    const readiness = createReadiness([alpha])

    await readiness.recordFailure(new Error('QUOTA_BYTES quota exceeded'))

    await vi.waitFor(() => {
      expect(readiness.getState()).toEqual({
        status: 'failed',
        message: 'QUOTA_BYTES quota exceeded',
      })
    })
  })

  it('picks up a failure recorded by another context', async () => {
    await storeAt('alpha', 1)
    const readiness = createReadiness([alpha])
    expect(await settledState(readiness)).toEqual({ status: 'pending' })

    const other = createReadiness([createStore('alpha')])
    await other.recordFailure(new Error('IO error'))

    await vi.waitFor(() => {
      expect(readiness.getState()).toEqual({
        status: 'failed',
        message: 'IO error',
      })
    })
  })

  it('keeps waiters waiting through a failure until a retry upgrades the stores', async () => {
    await storeAt('alpha', 1)
    const readiness = createReadiness([alpha])
    let isReady = false
    void readiness.waitUntilReady().then(() => {
      isReady = true
    })

    await readiness.recordFailure(new Error('IO error'))
    await vi.waitFor(() => {
      expect(readiness.getState().status).toBe('failed')
    })
    expect(isReady).toBe(false)

    await alpha.options.upgrade()
    await readiness.clearFailure()

    await vi.waitFor(() => {
      expect(isReady).toBe(true)
    })
  })

  it('goes back to pending when the failure record is cleared', async () => {
    await storeAt('alpha', 1)
    const readiness = createReadiness([alpha])
    await readiness.recordFailure(new Error('IO error'))
    await vi.waitFor(() => {
      expect(readiness.getState().status).toBe('failed')
    })

    await readiness.clearFailure()

    await vi.waitFor(() => {
      expect(readiness.getState()).toEqual({ status: 'pending' })
    })
  })

  it('is ready over a stale failure record once every store is current', async () => {
    await storeAt('alpha', 2)
    await fakeBrowser.storage.local.set({
      optionsUpgradeFailure: { message: 'IO error' },
    })

    const readiness = createReadiness([alpha])

    await expect(readiness.waitUntilReady()).resolves.toBeUndefined()
  })

  it('stays ready after a store is removed', async () => {
    await storeAt('alpha', 2)
    const readiness = createReadiness([alpha])
    await readiness.waitUntilReady()

    await fakeBrowser.storage.local.remove('alpha')
    await readiness.recordFailure(new Error('IO error'))

    expect(await settledState(readiness)).toEqual({ status: 'ready' })
  })

  it('notifies subscribers when the state changes and not after they leave', async () => {
    await storeAt('alpha', 1)
    const readiness = createReadiness([alpha])
    const seen: string[] = []
    const unsubscribe = readiness.subscribe(() => {
      seen.push(readiness.getState().status)
    })

    await readiness.recordFailure(new Error('IO error'))
    await vi.waitFor(() => {
      expect(seen).toEqual(['failed'])
    })
    unsubscribe()
    await alpha.options.upgrade()

    await vi.waitFor(() => {
      expect(readiness.getState().status).toBe('ready')
    })
    expect(seen).toEqual(['failed'])
  })

  it('stays pending when a store cannot be read', async () => {
    await storeAt('alpha', 2)
    vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValue(
      new Error('IO error')
    )
    const readiness = createReadiness([alpha])

    expect(await settledState(readiness)).toEqual({ status: 'pending' })
  })

  it('lets a store wait on readiness from its own constructor', async () => {
    let constructed = 0
    @injectable('Singleton')
    class SelfReadingStore implements IStoreService {
      readonly name = 'selfReading'
      readonly options: OptionsService<{ value: string }>

      constructor(@inject(ReadinessService) readiness: ReadinessService) {
        this.options = new OptionsService<{ value: string }>(
          readiness,
          'selfReading',
          { value: 'default' },
          silentLogger,
          'local'
        ).version(1, { upgrade: (data) => data })
        void this.options.get()
        constructed += 1
      }
    }
    await fakeBrowser.storage.local.set({
      selfReading: { data: { value: 'stored' }, version: 1 },
    })
    const container = new Container({ defaultScope: 'Singleton' })
    container.bind(ReadinessService).toSelf()
    container.bind(SelfReadingStore).toSelf()
    container.bind(LoggerSymbol).toConstantValue(silentLogger)
    container.bind(StoreServiceSymbol).toService(SelfReadingStore)
    container
      .bind<IOptionStoresProvider>(OptionStoresProvider)
      .toFactory((context) => {
        return () => context.getAll<IStoreService>(StoreServiceSymbol)
      })

    const store = container.get(SelfReadingStore)

    await expect(store.options.get()).resolves.toEqual({ value: 'stored' })
    expect(constructed).toBe(1)
  })
})
