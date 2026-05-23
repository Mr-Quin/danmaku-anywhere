import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Verifies the loginProbe path end-to-end: opening /providers triggers the
 * per-source React Query hooks, which RPC into the manifest pipeline. The
 * mocked nav / GetPageData fixtures' isLogin / ret fields drive the warning
 * icon visibility next to each builtin provider row.
 */

const NAV_URL = /api\.bilibili\.com\/x\/web-interface\/nav/
const TENCENT_DETAILS_URL =
  /pbaccess\.video\.qq\.com\/.*page_server_rpc\.PageServer\/GetPageData/

test('login probes hide warnings when bilibili is logged in and tencent has cookies', async ({
  context,
  page,
  extensionId,
}) => {
  const calls = { nav: 0, tencent: 0 }
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: {
      bilibili: { enabled: true },
      tencent: { enabled: true },
    },
    network: [
      {
        pattern: NAV_URL,
        respond: (route) => {
          calls.nav++
          return route.fulfill({
            json: { code: 0, message: '0', data: { isLogin: true } },
          })
        },
      },
      {
        pattern: TENCENT_DETAILS_URL,
        respond: (route) => {
          calls.tencent++
          return route.fulfill({ json: { ret: 0, msg: '', data: {} } })
        },
      },
    ],
  })

  await Popup.open(page, extensionId, '/providers')

  await expect.poll(() => calls.nav, { timeout: 5000 }).toBeGreaterThan(0)
  await expect.poll(() => calls.tencent, { timeout: 5000 }).toBeGreaterThan(0)
  await expect(page.locator('[data-testid^="provider-warning-"]')).toHaveCount(
    0
  )
})

test('bilibiliSetCookies fetches the URL declared by the manifest cookieSet field', async ({
  context,
  page,
  extensionId,
}) => {
  let cookieSetCalls = 0
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: {
      bilibili: { enabled: true },
    },
    network: [
      // Mock cookieSet URL + the bilibili + tencent loginProbes (both fire
      // when the popup mounts /providers because their list rows render
      // regardless of `enabled`) so strict-mode network doesn't fail.
      {
        pattern: /^https:\/\/www\.bilibili\.com\/?$/,
        respond: (route) => {
          cookieSetCalls++
          return route.fulfill({ status: 200, body: 'ok' })
        },
      },
      {
        pattern: NAV_URL,
        respond: (route) =>
          route.fulfill({
            json: { code: 0, message: '0', data: { isLogin: false } },
          }),
      },
      {
        pattern: TENCENT_DETAILS_URL,
        respond: (route) =>
          route.fulfill({ json: { ret: 0, msg: '', data: {} } }),
      },
    ],
  })

  // Open the popup so the SW is reachable, then invoke the RPC from page
  // context. Asserts the path manifest.cookieSet.url -> setCookies -> fetch.
  await Popup.open(page, extensionId, '/providers')
  const res = await page.evaluate(() =>
    chrome.runtime.sendMessage({
      method: 'bilibiliSetCookies',
      input: undefined,
    })
  )
  expect(res).toMatchObject({ state: 'success' })
  expect(cookieSetCalls).toBe(1)
})

test('login probes surface warning icons when probes report logged-out / no cookies', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: {
      bilibili: { enabled: true },
      tencent: { enabled: true },
    },
    network: [
      {
        pattern: NAV_URL,
        respond: (route) =>
          route.fulfill({
            json: {
              code: -101,
              message: '账号未登录',
              data: { isLogin: false },
            },
          }),
      },
      {
        pattern: TENCENT_DETAILS_URL,
        respond: (route) =>
          route.fulfill({ json: { ret: -1100001, msg: 'cookie required' } }),
      },
    ],
  })

  await Popup.open(page, extensionId, '/providers')

  await expect(page.getByTestId('provider-warning-bilibili')).toBeVisible()
  await expect(page.getByTestId('provider-warning-tencent')).toBeVisible()
})
