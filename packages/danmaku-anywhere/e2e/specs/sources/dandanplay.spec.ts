import { mockDandanplay } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Built-in DanDanPlay provider happy path through the proxy URL:
 * /v2/search/anime → /v2/bangumi/{id} → /v2/comment/{id}. Verifies that
 * the search submit, season-card click, episode-list render, and per-
 * episode danmaku fetch all wire through the popup → background RPC →
 * danmaku-provider stack and surface a comment count in the UI.
 */

test('dandanplay: search → season → episode → fetch danmaku', async ({
  context,
  page,
  extensionId,
  da,
}) => {
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

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')
  await popup.search.openFirstResult('DanDanPlay')
  const episode =
    await popup.seasonDetails.fetchDanmakuForFirstEpisode('DanDanPlay')
  await popup.seasonDetails.expectCommentCount(episode)
})
