import { randomUUID } from 'node:crypto'
import type { Integration } from '@danmaku-anywhere/integration-policy'
import type { BrowserContext } from '@playwright/test'
import { BUILT_IN_AI_PROVIDER_ID } from '../../src/common/options/aiProviderConfig/constant'
import {
  zIntegration,
  zIntegrationPolicy,
} from '../../src/common/options/integrationPolicyStore/schema'
import { LATEST_INTEGRATION_POLICY_VERSION } from '../../src/common/options/integrationPolicyStore/version'
import { LATEST_MOUNT_CONFIG_VERSION } from '../../src/common/options/mountConfig/version'
import type { DaClient } from './da-client'
import { applyProfile } from './profile'

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
    version: zIntegration.shape.version.value,
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
    version: zIntegrationPolicy.shape.version.value,
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

export const FIXTURE_EPISODE_TITLE = 'DA Integration Test'
// Seeking past FIXTURE_SEEK_TIME_S lands the cursor on at least one comment.
export const FIXTURE_SEEK_TIME_S = 15
// The comment due by FIXTURE_SEEK_TIME_S.
export const FIXTURE_FIRST_TEXT = 'first'
const FIXTURE_COMMENTS = [
  { p: '12,1,16777215,e2e-1', m: FIXTURE_FIRST_TEXT },
  { p: '24,1,16777215,e2e-2', m: 'second' },
  { p: '36,1,16777215,e2e-3', m: 'third' },
]

// Seeds a custom episode the fixture policy resolves by title (via
// LocalMatchingStrategy's fuzzy fallback) and an XPath integration for
// `patterns`, then waits out content-script registration.
export async function seedFixtureIntegration(
  context: BrowserContext,
  da: DaClient,
  patterns: string[]
): Promise<{ episodeId: number }> {
  await applyProfile(context, da, {
    extensionOptions: { matchLocalDanmaku: true },
  })

  const customEpisode = await da.episode.addCustom({
    title: FIXTURE_EPISODE_TITLE,
    comments: FIXTURE_COMMENTS,
    commentCount: FIXTURE_COMMENTS.length,
    schemaVersion: 4,
  })

  await seedXPathIntegration(da, {
    patterns,
    name: 'da-e2e',
    policy: buildFixtureIntegrationPolicy(),
  })

  for (const pattern of patterns) {
    await da.mount.waitForRegistration(pattern, 5_000)
  }

  return { episodeId: customEpisode.id }
}
