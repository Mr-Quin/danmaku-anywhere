import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Verifies the manifest-driven loginProbe flow end-to-end: opening /providers
 * probes each enabled source via providerProbeLogin(manifestId). The background
 * routes each manifest's loginProbe through the engine; sources reporting
 * logged-out surface in the "Needs attention" callout with a Sign in action,
 * and the callout is absent when every probe reports logged-in.
 */

const ATTENTION = /Needs attention|存在问题/
const SIGN_IN = /^(Sign in|登录)$/

const NAV_URL = /api\.bilibili\.com\/x\/web-interface\/nav/
const TENCENT_DETAILS_URL =
  /pbaccess\.video\.qq\.com\/.*page_server_rpc\.PageServer\/GetPageData/

test('hides warnings when both probes return logged-in / cookies-present', async ({
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
  await expect(page.getByText(ATTENTION)).toHaveCount(0)
  await expect(page.getByRole('button', { name: SIGN_IN })).toHaveCount(0)
})

test('surfaces warning icons when probes report logged-out / no cookies', async ({
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

  await expect(page.getByText(ATTENTION)).toBeVisible()
  await expect(page.getByRole('button', { name: SIGN_IN })).toHaveCount(2)
})
