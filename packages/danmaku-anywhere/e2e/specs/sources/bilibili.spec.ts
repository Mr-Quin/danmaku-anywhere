import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import {
  loadBinaryFixture,
  loadJsonFixture,
  loadTextFixture,
  mockBilibiliProto,
  mockBilibiliXml,
} from '../../setup/network'
import { openPopup, submitSearch } from '../../setup/popup'
import { applyProfile } from '../../setup/profile'

const COMMON = {
  searchBangumi: loadJsonFixture('bilibili-search-bangumi.json'),
  searchFt: loadJsonFixture('bilibili-search-ft.json'),
  season: loadJsonFixture('bilibili-season.json'),
}

async function runHappyPath(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  extensionId: string
) {
  await openPopup(page, extensionId)
  await submitSearch(page, 'frieren')

  const seasonCard = page
    .locator('[data-testid^="season-card-Bilibili-"]')
    .first()
  await expect(seasonCard).toBeVisible({ timeout: 15_000 })
  await seasonCard.click()

  const firstEpisode = page
    .locator('[data-testid^="episode-list-item-Bilibili-"]')
    .first()
  await expect(firstEpisode).toBeVisible({ timeout: 15_000 })
  await firstEpisode.click()

  await expect(firstEpisode).toContainText(/\d+\s*(条弹幕|comments?)/i, {
    timeout: 15_000,
  })
}

test('bilibili xml: search → season → episode → fetch xml danmaku', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
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
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: {
      bilibili: {
        enabled: true,
        options: { danmakuTypePreference: 'protobuf' },
      },
    },
    network: mockBilibiliProto({
      ...COMMON,
      protoSegment1: loadBinaryFixture('bilibili-proto-seg-1.bin'),
    }),
  })

  await runHappyPath(page, extensionId)
})
