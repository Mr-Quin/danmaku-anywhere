import { Container } from 'inversify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import { StoreServiceSymbol } from '@/common/options/IStoreService'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { silentLogger } from '@/tests/silentLogger'
import { StandaloneUpgradeService } from './StandaloneUpgradeService'

vi.mock('@/common/constants', () => {
  return {
    EXTENSION_VERSION: '1.0.0',
  }
})

/**
 * StandaloneUpgradeService follows the background upgrade rule: the version
 * marker is written and readiness signalled only when every store persisted.
 * A store that fails makes the call reject with the store's key.
 */

// lint-specs-allow-call-only: upgrade() returns void; whether it records the version and signals readiness is the observable behavior

function makeStore(
  key: string,
  upgrade = vi.fn().mockResolvedValue(undefined)
) {
  return {
    name: key,
    options: {
      key,
      readStoredUnblocked: vi
        .fn()
        .mockResolvedValue({ data: { key }, version: 1 }),
      upgrade,
    },
  }
}

describe('StandaloneUpgradeService', () => {
  let container: Container
  let readiness: {
    setVersion: ReturnType<typeof vi.fn>
    setReady: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    readiness = {
      setVersion: vi.fn().mockResolvedValue(undefined),
      setReady: vi.fn(),
    }
    container = new Container()
    container.bind(StandaloneUpgradeService).toSelf()
    container.bind(ReadinessService).toConstantValue(readiness as never)
    container.bind(LoggerSymbol).toConstantValue(silentLogger)
  })

  it('records the version once every store upgraded', async () => {
    container.bind(StoreServiceSymbol).toConstantValue(makeStore('alpha'))
    container.bind(StoreServiceSymbol).toConstantValue(makeStore('beta'))

    await container.get(StandaloneUpgradeService).upgrade()

    expect(readiness.setVersion).toHaveBeenCalledWith('1.0.0')
    expect(readiness.setReady).toHaveBeenCalled()
  })

  it('rejects naming the failed store without recording the version', async () => {
    const beta = makeStore('beta')
    container
      .bind(StoreServiceSymbol)
      .toConstantValue(
        makeStore(
          'alpha',
          vi.fn().mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'))
        )
      )
    container.bind(StoreServiceSymbol).toConstantValue(beta)

    await expect(
      container.get(StandaloneUpgradeService).upgrade()
    ).rejects.toThrow(/alpha/)

    expect(beta.options.upgrade).toHaveBeenCalled()
    expect(readiness.setVersion).not.toHaveBeenCalled()
    expect(readiness.setReady).not.toHaveBeenCalled()
  })
})
