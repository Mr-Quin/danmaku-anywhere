import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, mockTencent } from '../../setup/network'
import { openPopup, submitSearch } from '../../setup/popup'
import { applyProfile } from '../../setup/profile'

test('tencent: search → season → episode → fetch danmaku', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { tencent: { enabled: true } },
    network: mockTencent({
      search: loadJsonFixture('tencent-search.json'),
      episodes: loadJsonFixture('tencent-episodes.json'),
      danmakuBase: loadJsonFixture('tencent-danmaku-base.json'),
      danmakuSegments: {
        '0': loadJsonFixture('tencent-danmaku-segment-0.json'),
        '30000': loadJsonFixture('tencent-danmaku-segment-30000.json'),
      },
    }),
  })

  await openPopup(page, extensionId)
  await submitSearch(page, 'frieren')

  const seasonCard = page
    .locator('[data-testid^="season-card-Tencent-"]')
    .first()
  await expect(seasonCard).toBeVisible({ timeout: 15_000 })
  await seasonCard.click()

  const firstEpisode = page
    .locator('[data-testid^="episode-list-item-Tencent-"]')
    .first()
  await expect(firstEpisode).toBeVisible({ timeout: 15_000 })
  await firstEpisode.click()

  await expect(firstEpisode).toContainText(/\d+\s*(条弹幕|comments?)/i, {
    timeout: 15_000,
  })
})
