import { fakeBrowser } from '@webext-core/fake-browser'
import type { Container } from 'inversify'
import { backgroundContainerModule } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import type { Options } from '@/common/options/OptionsService/types'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'

// Options stores block every read on readiness, which production only reaches
// once the upgrade run completes. Tests drive upgrades directly, so the
// container hands back a store that is already ready.
export function createOptionsContainer(): Container {
  const container = createTestContainer(
    [backgroundContainerModule],
    [{ identifier: LoggerSymbol, value: silentLogger }]
  )
  container.get(ReadinessService).setReady()
  return container
}

export function optionsStorage<T>(key: string) {
  return {
    seed: async (data: unknown, version: number): Promise<void> => {
      await fakeBrowser.storage.sync.set({ [key]: { data, version } })
    },
    read: async (): Promise<Options<T>> => {
      const stored = await fakeBrowser.storage.sync.get(key)
      return stored[key] as Options<T>
    },
  }
}
