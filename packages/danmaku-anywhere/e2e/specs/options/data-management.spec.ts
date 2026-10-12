import { Popup } from '../../pom/Popup'
import {
  makeBilibiliEpisode,
  makeBilibiliSeason,
} from '../../setup/bilibiliSeed'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Data Management "Purge Now". With the retention policy on, it first asks for
 * confirmation and names how many episodes will go, deletes only those once
 * confirmed, and reports the count in episodes. Cancelling deletes nothing.
 * With the policy off the button is disabled and the page says why.
 */

const DAY = 24 * 60 * 60 * 1000

// The options pages read the auth session for the account card. Stub it to
// "no session".
test.beforeEach(async ({ context }) => {
  await context.route('**/auth/get-session*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    })
  )
})
const PURGE_NOW = /^(Purge Now|立即清理)$/

async function seedEpisodes(da: import('../../setup/da-client').DaClient) {
  const season = await da.season.add(makeBilibiliSeason())
  const old = await Promise.all(
    [1300001, 1300002].map((cid, i) =>
      da.episode.add(
        makeBilibiliEpisode(season.id, { cid, episodeNumber: String(i + 1) })
      )
    )
  )
  const recent = await da.episode.add(
    makeBilibiliEpisode(season.id, { cid: 1300003, episodeNumber: '3' })
  )
  for (const episode of old) {
    await da.episode.setTimeUpdated(episode.id, Date.now() - 60 * DAY)
  }
  return { old, recent }
}

test('purge now confirms with the episode count before deleting', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    extensionOptions: {
      retentionPolicy: { enabled: true, deleteCommentsAfter: 30 },
    },
  })
  const { old, recent } = await seedEpisodes(da)

  const popup = await Popup.open(page, extensionId, '/options/data-management')
  await page.getByRole('button', { name: PURGE_NOW }).click()

  await popup.dialog.expectBody(/Delete 2 downloaded episodes|将删除2集/)
  await popup.dialog.cancel()
  await popup.dialog.expectHidden()
  expect(await da.episode.get(old[0].id)).toBeDefined()

  await page.getByRole('button', { name: PURGE_NOW }).click()
  await popup.dialog.confirm()

  await popup.toast.expectSuccess(/2 episodes deleted|已删除2集/)
  await expect.poll(() => da.episode.get(old[0].id)).toBeUndefined()
  await expect.poll(() => da.episode.get(old[1].id)).toBeUndefined()
  expect(await da.episode.get(recent.id)).toBeDefined()
})

test('purge now is disabled while the retention policy is off', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    extensionOptions: {
      retentionPolicy: { enabled: false, deleteCommentsAfter: 30 },
    },
  })
  const { old } = await seedEpisodes(da)

  await Popup.open(page, extensionId, '/options/data-management')

  await expect(page.getByRole('button', { name: PURGE_NOW })).toBeDisabled()
  await expect(
    page.getByText(/Turn on the retention policy|开启保留策略后/)
  ).toBeVisible()
  expect(await da.episode.get(old[0].id)).toBeDefined()
})
