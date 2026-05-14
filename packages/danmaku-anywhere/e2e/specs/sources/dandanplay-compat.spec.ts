import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, mockDandanplayCompat } from '../../setup/network'
import { openPopup, submitSearch } from '../../setup/popup'
import { applyProfile } from '../../setup/profile'

const COMPAT_BASE_URL = 'https://compat.example.invalid'

// DanDanPlayCompatible provider with custom baseUrl. Built-ins all disabled
// so the only configured source is the custom one.
const compatConfig: ProviderConfig = {
  id: 'compat-test-1',
  type: 'DanDanPlayCompatible',
  name: 'CompatTest',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  isBuiltIn: false,
  options: {
    baseUrl: COMPAT_BASE_URL,
    auth: { enabled: false, headers: [] },
  },
}

test('dandanplay-compat: custom baseUrl flow', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    customProviders: [compatConfig],
    network: mockDandanplayCompat({
      baseUrl: COMPAT_BASE_URL,
      search: loadJsonFixture('ddp-compat-search.json'),
      bangumi: loadJsonFixture('ddp-compat-bangumi.json'),
      comments: loadJsonFixture('ddp-compat-comments.json'),
    }),
  })

  await openPopup(page, extensionId)
  await submitSearch(page, 'frieren')

  // Compat provider maps to the DanDanPlay impl, so the testid prefix is
  // season-card-DanDanPlay (provider is the canonical DanmakuSourceType).
  const seasonCard = page
    .locator('[data-testid^="season-card-DanDanPlay-"]')
    .first()
  await expect(seasonCard).toBeVisible({ timeout: 15_000 })
  await seasonCard.click()

  const firstEpisode = page
    .locator('[data-testid^="episode-list-item-DanDanPlay-"]')
    .first()
  await expect(firstEpisode).toBeVisible({ timeout: 15_000 })
  await firstEpisode.click()

  await expect(firstEpisode).toContainText(/\d+\s*(条弹幕|comments?)/i, {
    timeout: 15_000,
  })
})
