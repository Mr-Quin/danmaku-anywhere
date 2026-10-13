import type { Container } from 'inversify'
import { backgroundContainerModule } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import {
  type ReadinessGate,
  ReadinessService,
} from '@/common/options/ReadinessService/ReadinessService'
import {
  createTestContainer,
  type TestContainerOverride,
} from './createTestContainer'
import { silentLogger } from './silentLogger'

interface UpgradeContainerOptions {
  ready?: boolean
}

// With ready, store reads and writes go through without every other store
// having been upgraded first, so a test can upgrade or seed one store alone.
export function createUpgradeContainer({
  ready = true,
}: UpgradeContainerOptions = {}): Container {
  const overrides: TestContainerOverride<unknown>[] = [
    { identifier: LoggerSymbol, value: silentLogger },
  ]
  if (ready) {
    const alwaysReady: ReadinessGate = {
      waitUntilReady: () => Promise.resolve(),
    }
    overrides.push({ identifier: ReadinessService, value: alwaysReady })
  }
  return createTestContainer([backgroundContainerModule], overrides)
}
