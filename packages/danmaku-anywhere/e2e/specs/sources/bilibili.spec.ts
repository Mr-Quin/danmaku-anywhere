import type { Page } from '@playwright/test'
import { mockBilibiliProto, mockBilibiliXml } from '../../network/bilibili'
import { Popup } from '../../pom/Popup'
import { test } from '../../setup/fixtures'
import {
  loadBinaryFixture,
  loadJsonFixture,
  loadTextFixture,
} from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Bilibili happy path in two danmakuTypePreference modes:
 *  - xml:   /x/v1/dm/list.so → text fixture
 *  - proto: /x/v2/dm/web/seg.so → protobuf segment (exercises the decoder)
 * Both share the search + season fetch paths via runHappyPath().
 */

const COMMON = {
  searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
  searchFt: loadJsonFixture('bilibili-search-ft.json'),
  season: loadJsonFixture('bilibili-season.json'),
}

async function runHappyPath(page: Page, extensionId: string): Promise<void> {
  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')
  await popup.search.openFirstResult('Bilibili')
  const episode =
    await popup.seasonDetails.fetchDanmakuForFirstEpisode('Bilibili')
  await popup.seasonDetails.expectCommentCount(episode)
}

test('bilibili xml: search → season → episode → fetch xml danmaku', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: mockBilibiliXml({
      ...COMMON,
      xml: loadTextFixture('bilibili-xml.xml'),
    }),
  })

  await runHappyPath(page, extensionId)
})

test('bilibili proto: same flow, danmaku via /seg.so protobuf', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: {
      bilibili: {
        enabled: true,
        options: { danmakuFormat: 'protobuf' },
      },
    },
    network: mockBilibiliProto({
      ...COMMON,
      protoSegment1: loadBinaryFixture('bilibili-proto-seg-1.bin'),
    }),
  })

  await runHappyPath(page, extensionId)
})
