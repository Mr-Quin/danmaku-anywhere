import type { Container } from 'inversify'
import { backgroundContainerModule } from '@/background/ioc'
import { LoggerSymbol } from '@/common/Logger'
import { ReadinessService } from '@/common/options/ReadinessService/ReadinessService'
import { createTestContainer } from './createTestContainer'
import { silentLogger } from './silentLogger'

interface UpgradeContainerOptions {
  ready?: boolean
}

export function createUpgradeContainer({
  ready = true,
}: UpgradeContainerOptions = {}): Container {
  const container = createTestContainer(
    [backgroundContainerModule],
    [{ identifier: LoggerSymbol, value: silentLogger }]
  )
  if (ready) {
    container.get(ReadinessService).setReady()
  }
  return container
}
