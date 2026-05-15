import { randomUUID } from 'node:crypto'
import type { Integration } from '@danmaku-anywhere/integration-policy'
import { BUILT_IN_AI_PROVIDER_ID } from '../../src/common/options/aiProviderConfig/constant'
import type { DaClient } from './da-client'

// Storage versions match the latest version declared by the corresponding
// services. Bumping a service version (look for `.version(N, {...})` in
// `src/common/options/mountConfig/service.ts` and
// `src/common/options/integrationPolicyStore/service.ts`) means bumping the
// matching constant here — there's no compile-time link.
const MOUNT_CONFIG_VERSION = 6
const INTEGRATION_POLICY_VERSION = 4

export interface IntegrationSeedInput {
  // Match patterns the controller content script will be registered for.
  // Use Chrome match-pattern syntax (e.g. https://www.example.com/play/*).
  patterns: string[]
  // CSS selector for the <video> element on the integration target page.
  mediaQuery?: string
  // Human-readable name shown in the popup; doesn't affect runtime behavior.
  name?: string
  policy: Integration['policy']
}

export interface IntegrationSeedResult {
  mountConfigId: string
  integrationId: string
}

// Seed a single MountConfig + matching IntegrationPolicy via raw storage
// writes. Writes are immediate but content-script (re)registration happens
// asynchronously when MountConfigService picks up the chrome.storage change —
// the caller must wait via da.mount.waitForRegistration before navigating.
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
    version: INTEGRATION_POLICY_VERSION,
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
    version: MOUNT_CONFIG_VERSION,
  })

  return { mountConfigId, integrationId }
}

// Generic integration policy keyed to data-testid hooks on the fixture
// pages (native-video.html, iframe-host.html). Lets multiple specs reuse the
// same selectors without restating XPath strings.
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
