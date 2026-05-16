import { randomUUID } from 'node:crypto'
import type { Integration } from '@danmaku-anywhere/integration-policy'
import { BUILT_IN_AI_PROVIDER_ID } from '../../src/common/options/aiProviderConfig/constant'
import { LATEST_INTEGRATION_POLICY_VERSION } from '../../src/common/options/integrationPolicyStore/version'
import { LATEST_MOUNT_CONFIG_VERSION } from '../../src/common/options/mountConfig/version'
import type { DaClient } from './da-client'

export interface IntegrationSeedInput {
  // Chrome match-pattern syntax (e.g. https://www.example.com/play/*).
  patterns: string[]
  mediaQuery?: string
  name?: string
  policy: Integration['policy']
}

export interface IntegrationSeedResult {
  mountConfigId: string
  integrationId: string
}

// Storage writes are immediate; content-script registration is async, so
// callers must `da.mount.waitForRegistration` before navigating.
export async function seedXPathIntegration(
  da: DaClient,
  input: IntegrationSeedInput
): Promise<IntegrationSeedResult> {
  const integrationId = randomUUID()
  const mountConfigId = randomUUID()

  const integration: Integration = {
    version: 3,
    id: integrationId,
    name: input.name ?? 'e2e integration',
    policy: input.policy,
  }

  await da.storage.setRaw('local', 'xpathPolicy', {
    data: [integration],
    version: LATEST_INTEGRATION_POLICY_VERSION,
  })

  await da.storage.setRaw('sync', 'mountConfig', {
    data: [
      {
        id: mountConfigId,
        patterns: input.patterns,
        mediaQuery: input.mediaQuery ?? 'video',
        enabled: true,
        name: input.name ?? 'e2e integration',
        mode: 'xpath',
        integration: integrationId,
        ai: { providerId: BUILT_IN_AI_PROVIDER_ID },
      },
    ],
    version: LATEST_MOUNT_CONFIG_VERSION,
  })

  return { mountConfigId, integrationId }
}

// Generic policy keyed to data-testid hooks on the fixture pages.
export function buildFixtureIntegrationPolicy(): Integration['policy'] {
  return {
    version: 3,
    title: {
      selector: [{ value: '//*[@data-testid="da-title"]', quick: true }],
      regex: [],
    },
    episode: {
      selector: [{ value: '//*[@data-testid="da-episode"]', quick: true }],
      regex: [],
    },
    season: { selector: [], regex: [] },
    episodeTitle: { selector: [], regex: [] },
    options: {},
  }
}
