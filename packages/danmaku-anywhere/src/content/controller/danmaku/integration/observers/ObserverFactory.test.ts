import { describe, expect, it } from 'vitest'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { AiIntegrationObserver } from './AiIntegrationObserver'
import { NoopMediaObserver } from './NoopMediaObserver'
import { ObserverFactory } from './ObserverFactory'
import { XPathIntegrationObserver } from './XPathIntegrationObserver'

function makeConfig(mode: MountConfig['mode']): MountConfig {
  return createMountConfig({ mode }) as MountConfig
}

const mockPolicy = {} as IntegrationPolicy

describe('ObserverFactory', () => {
  it('creates AiIntegrationObserver for ai mode', () => {
    const observer = ObserverFactory.create(makeConfig('ai'), null)
    expect(observer).toBeInstanceOf(AiIntegrationObserver)
  })

  it('creates XPathIntegrationObserver for xpath mode', () => {
    const observer = ObserverFactory.create(makeConfig('xpath'), mockPolicy)
    expect(observer).toBeInstanceOf(XPathIntegrationObserver)
  })

  it('creates XPathIntegrationObserver for xpath mode with null policy', () => {
    const observer = ObserverFactory.create(makeConfig('xpath'), null)
    expect(observer).toBeInstanceOf(XPathIntegrationObserver)
  })

  it('creates NoopMediaObserver for manual mode', () => {
    const observer = ObserverFactory.create(makeConfig('manual'), null)
    expect(observer).toBeInstanceOf(NoopMediaObserver)
  })

  it('creates NoopMediaObserver for unknown mode', () => {
    const observer = ObserverFactory.create(makeConfig('manual'), mockPolicy)
    expect(observer).toBeInstanceOf(NoopMediaObserver)
  })
})
