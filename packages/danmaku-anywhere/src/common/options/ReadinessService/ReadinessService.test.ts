import { fakeBrowser } from '@webext-core/fake-browser'
import { Container } from 'inversify'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoggerSymbol } from '@/common/Logger'
import { silentLogger } from '@/tests/silentLogger'
import { ReadinessService } from './ReadinessService'

vi.mock('@/common/constants', () => {
  return {
    EXTENSION_VERSION: '1.0.0',
  }
})

function storeLastVersion(version: string) {
  return fakeBrowser.storage.local.set({
    lastVersion: { lastVersion: version },
  })
}

describe('ReadinessService', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()
    container.bind(ReadinessService).toSelf()
    container.bind(LoggerSymbol).toConstantValue(silentLogger)
  })

  it('is ready immediately when the stored version matches', async () => {
    await storeLastVersion('1.0.0')

    const service = container.get(ReadinessService)

    await expect(service.waitUntilReady()).resolves.toBeUndefined()
  })

  it('unblocks when another context records the current version', async () => {
    await storeLastVersion('0.9.0')

    const service = container.get(ReadinessService)
    let isReady = false
    void service.waitUntilReady().then(() => {
      isReady = true
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(isReady).toBe(false)

    await storeLastVersion('1.0.0')

    await service.waitUntilReady()
    expect(isReady).toBe(true)
  })

  it('unblocks when the version is recorded while the initial read is in flight', async () => {
    await storeLastVersion('0.9.0')
    const get = fakeBrowser.storage.local.get.bind(fakeBrowser.storage.local)
    vi.spyOn(fakeBrowser.storage.local, 'get').mockImplementationOnce(
      async (keys) => {
        const stale = await get(keys)
        await storeLastVersion('1.0.0')
        return stale
      }
    )

    const service = container.get(ReadinessService)

    await expect(service.waitUntilReady()).resolves.toBeUndefined()
  })
})
