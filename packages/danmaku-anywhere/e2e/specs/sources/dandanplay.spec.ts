import { mockDandanplay } from '../../network/dandanplay'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

test('dandanplay: search → season → episode → fetch danmaku', async ({
  context,
  page,
  extensionId,
}) => {
  // TEMP CI DIAGNOSTIC — log every SW-originated URL involving danmaku/ddp
  // and any popup console error so we can see what hostname the failing
  // run is actually hitting.
  context.on('request', (req) => {
    const u = req.url()
    if (u.includes('ddp') || u.includes('danmaku') || u.includes('weeblify')) {
      console.log('[REQ]', req.method(), u)
    }
  })
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[POPUP-ERR]', m.text())
  })
  context.on('serviceworker', (sw) => {
    sw.on('console', (m) => {
      if (m.type() === 'error') console.log('[SW-ERR]', m.text())
    })
  })
  for (const sw of context.serviceWorkers()) {
    sw.on('console', (m) => {
      if (m.type() === 'error') console.log('[SW-ERR]', m.text())
    })
  }

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

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')
  await popup.search.openFirstResult('DanDanPlay')
  const episode =
    await popup.seasonDetails.fetchDanmakuForFirstEpisode('DanDanPlay')
  await popup.seasonDetails.expectCommentCount(episode)
})
