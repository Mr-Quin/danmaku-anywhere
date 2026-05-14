import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture, mockDandanplay } from '../../setup/network'
import { openPopup, submitSearch } from '../../setup/popup'
import { applyProfile } from '../../setup/profile'

test('dandanplay: search → season → episode → fetch danmaku', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    network: [
      mockDandanplay({
        search: loadJsonFixture('ddp-search.json'),
        bangumi: loadJsonFixture('ddp-bangumi.json'),
        comments: loadJsonFixture('ddp-comments.json'),
      }),
    ],
  })

  await openPopup(page, extensionId)
  await submitSearch(page, 'frieren')

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

  // After fetch, the list item secondary text shows the comment count.
  // Tolerate i18n: zh ("条弹幕") or en ("comments").
  await expect(firstEpisode).toContainText(/\d+\s*(条弹幕|comments?)/i, {
    timeout: 15_000,
  })
})
