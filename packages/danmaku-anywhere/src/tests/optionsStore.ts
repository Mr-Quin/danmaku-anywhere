import { fakeBrowser } from '@webext-core/fake-browser'
import type { Container } from 'inversify'
import { backgroundContainerModule } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import type { Options } from '@/common/options/OptionsService/types'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { createTestContainer } from '@/tests/createTestContainer'
import { silentLogger } from '@/tests/silentLogger'

// Options stores block every read on readiness, which production only reaches
// once the whole upgrade run completes. A test driving one store's upgrade
// directly has to start ready or its reads never resolve. A test driving
// UpgradeService wants the opposite: readiness has to stay closed until the run
// ends, because that is what decides whether a write issued from inside a
// migration lands before or after the other stores upgrade.
export function createOptionsContainer({ ready = true } = {}): Container {
  const container = createTestContainer(
    [backgroundContainerModule],
    [{ identifier: LoggerSymbol, value: silentLogger }]
  )
  if (ready) {
    container.get(ReadinessService).setReady()
  }
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
