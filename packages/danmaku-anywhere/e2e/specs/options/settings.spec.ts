import { Language } from '../../../src/common/localization/language'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'

/**
 * Settings menu (/options) redesign: the grouped menu surfaces an account
 * card plus status subtitles wired to live extension options. Asserts the
 * signed-out account card and the seeded retention subtitle render, and that
 * opening Player Settings and toggling a switch persists the option.
 */

// The account card reads the auth session, which better-auth resolves over
// the network. Stub it to "no session" so the signed-out card renders.
test.beforeEach(async ({ context }) => {
  await context.route('**/auth/get-session*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    })
  )
})

test('settings menu shows the account card and live status subtitles', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  const current = await da.extensionOptions.get()
  await da.extensionOptions.update({
    lang: Language.en,
    retentionPolicy: { enabled: true, deleteCommentsAfter: 7 },
    playerOptions: {
      ...current.playerOptions,
      showSkipButton: false,
      showDanmakuTimeline: false,
    },
  })

  const popup = await Popup.open(page, extensionId, '/options')

  await expect(popup.options.subtitle('Sign in to sync')).toBeVisible()
  await expect(popup.options.subtitle('Retention: 7 days')).toBeVisible()
})

test('toggling a player option persists the option', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  const current = await da.extensionOptions.get()
  await da.extensionOptions.update({
    lang: Language.en,
    playerOptions: {
      ...current.playerOptions,
      showSkipButton: false,
      showDanmakuTimeline: false,
    },
  })

  const popup = await Popup.open(page, extensionId, '/options')

  await popup.options.openSubPage(/Player Settings/)
  await expect(page).toHaveURL(/#\/options\/player$/)
  // One-off section heading on the player sub-page, asserted only here.
  await expect(page.getByText('In-player controls')).toBeVisible()

  const skipButton = popup.options.toggle(0)
  await expect(skipButton).not.toBeChecked()
  await skipButton.click()
  await expect(skipButton).toBeChecked()

  await expect
    .poll(() =>
      da.extensionOptions.get().then((o) => o.playerOptions.showSkipButton)
    )
    .toBe(true)

  await page.goBack()
  await expect(page).toHaveURL(/#\/options$/)
})
