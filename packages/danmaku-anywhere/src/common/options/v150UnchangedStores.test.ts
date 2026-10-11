import { beforeEach, describe, expect, it } from 'vitest'
import { createUpgradeContainer } from '@/tests/createUpgradeContainer'
import {
  readStoredV150Store,
  readV150Store,
  seedV150Store,
} from '@/tests/v150Backup'
import { AiProviderConfigService } from './aiProviderConfig/service'
import type { IStoreService } from './IStoreService'
import { IntegrationPolicyService } from './integrationPolicyStore/service'
import { MountConfigService } from './mountConfig/service'

/**
 * Seeds chrome.storage.sync with the mountConfig, integrationPolicy and
 * aiProviderConfig the v1.5.0 build wrote (the e2e backup fixture) and runs
 * each real upgrade. These stores were already at their latest version, so
 * the data must come back deeply equal at the same version.
 */

const cases = [
  { name: 'mountConfig', version: 6, token: MountConfigService, entries: 2 },
  {
    name: 'integrationPolicy',
    version: 4,
    token: IntegrationPolicyService,
    entries: 1,
  },
  {
    name: 'aiProviderConfig',
    version: 1,
    token: AiProviderConfigService,
    entries: 3,
  },
] as const

describe.each(cases)('$name upgrade from the v1.5.0 fixture', (testCase) => {
  const fixture = readV150Store<unknown[]>(testCase.name)
  let service: IStoreService

  beforeEach(async () => {
    await seedV150Store(testCase.name)
    service = createUpgradeContainer().get<IStoreService>(testCase.token)
  })

  it('is stored at the latest version of the store', () => {
    expect(fixture.version).toBe(testCase.version)
    expect(service.options.latestVersion).toBe(testCase.version)
    expect(fixture.data).toHaveLength(testCase.entries)
  })

  it('comes back from the upgrade deeply equal at the same version', async () => {
    await service.options.upgrade({})

    expect(await readStoredV150Store(testCase.name)).toEqual(fixture)
    expect(await service.options.get()).toEqual(fixture.data)
    expect(await service.options.getVersion()).toBe(fixture.version)
  })
})
