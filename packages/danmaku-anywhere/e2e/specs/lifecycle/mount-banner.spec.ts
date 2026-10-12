import type { BrowserContext } from '@playwright/test'
import { BUILT_IN_AI_PROVIDER_ID } from '../../../src/common/options/aiProviderConfig/constant'
import { LATEST_MOUNT_CONFIG_VERSION } from '../../../src/common/options/mountConfig/version'
import { IntegrationPage } from '../../pom/IntegrationPage'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * The mount availability banner on the popup. Closing the "no mount config"
 * banner keeps it closed when the popup reopens for the same site. On a page
 * that is connected to a mount config, an empty library tells the user how to
 * get danmaku onto the video.
 */

const ORIGIN = 'https://da-test.invalid'
const NO_CONFIG = /^(No mount config for this site|该网站暂无装填配置)$/

async function getTabId(context: BrowserContext): Promise<number> {
  const [sw] = context.serviceWorkers()
  const worker = sw ?? (await context.waitForEvent('serviceworker'))
  const tabId = await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url })
    return tab?.id
  }, `${ORIGIN}/*`)
  if (tabId === undefined) {
    throw new Error(`No tab matches ${ORIGIN}`)
  }
  return tabId
}

test('a dismissed no-config banner stays closed for that site', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})
  await new IntegrationPage(page).open(`${ORIGIN}/watch/`, 'native-video.html')
  const tabId = await getTabId(context)

  const popupPage = await context.newPage()
  await Popup.open(popupPage, extensionId, '/mount', { detached: true, tabId })
  const banner = popupPage.getByText(NO_CONFIG)
  await expect(banner).toBeVisible()

  await popupPage
    .getByRole('alert')
    .getByRole('button', { name: /^(Close|关闭)$/ })
    .click()
  await expect(banner).toBeHidden()

  await popupPage.reload()
  await expect(
    popupPage.getByText(/The library is empty|弹幕库里什么也没有/)
  ).toBeVisible()
  await expect(banner).toBeHidden()
})

test('an empty library on a connected page explains how to mount', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})
  await da.storage.setRaw('sync', 'mountConfig', {
    data: [
      {
        id: 'e2e-manual',
        patterns: [`${ORIGIN}/*`],
        mediaQuery: 'video',
        enabled: true,
        name: 'da-test',
        mode: 'manual',
        ai: { providerId: BUILT_IN_AI_PROVIDER_ID },
      },
    ],
    version: LATEST_MOUNT_CONFIG_VERSION,
  })
  await da.mount.waitForRegistration(`${ORIGIN}/*`, 5_000)
  await new IntegrationPage(page).open(`${ORIGIN}/watch/`, 'native-video.html')
  const tabId = await getTabId(context)

  const popupPage = await context.newPage()
  const popup = await Popup.open(popupPage, extensionId, '/mount', {
    detached: true,
    tabId,
  })

  await expect(popup.mount.mountHint()).toBeVisible()
  await expect(popup.mount.mountHint()).toHaveText(
    /download an episode, then click it|下载一集，然后点击它/
  )
})
