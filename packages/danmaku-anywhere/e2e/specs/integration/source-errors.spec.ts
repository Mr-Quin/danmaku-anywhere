import { IntegrationPage } from '../../pom/IntegrationPage'
import { Toast } from '../../pom/Toast'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * A danmaku source that fails during automatic matching produces one error
 * toast that names the source instead of echoing the HTTP error and request
 * URL. It offers the search page and stays up long enough to act on. Covers a
 * failed search and a failed comment fetch after a successful match. Asserts
 * toast text, action, count and that it outlives the default duration.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const DDP_SEARCH_URL = /\/ddp\/api\/v2\/search\/anime/
const DDP_BANGUMI_URL = /\/ddp\/api\/v2\/bangumi\//
const DDP_COMMENT_URL = /\/ddp\/api\/v2\/comment\//

const UNREACHABLE =
  /^(Couldn't reach DanDanPlay|无法连接到 (DanDanPlay|弹弹play))/
const OPEN_SEARCH = /^(Open search page|打开搜索页面)$/

function singleSearchResult() {
  const search = loadJsonFixture('ddp-search.json') as { animes: unknown[] }
  return { ...search, animes: search.animes.slice(0, 1) }
}

test.use({
  expectedConsoleErrors: [/\[RpcManager\] Error in RPC handler.*HTTP 500/],
})

test('a failed search shows one error naming the source', async ({
  context,
  page,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    network: [
      {
        pattern: DDP_SEARCH_URL,
        respond: (route) => route.fulfill({ status: 500, body: 'down' }),
      },
    ],
  })
  await seedXPathIntegration(da, {
    patterns: [MOUNT_PATTERN],
    policy: buildFixtureIntegrationPolicy(),
  })
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  const toast = new Toast(page)
  await toast.expectError(UNREACHABLE, { timeout: 15_000 })
  const error = toast.bySeverity('error')
  await expect(error).toHaveCount(1)
  await expect(error).not.toContainText('proxy.test.invalid')
  await expect(error.getByRole('button', { name: OPEN_SEARCH })).toBeVisible()

  await page.waitForTimeout(5_000)
  await expect(error).toBeVisible()
})

test('a failed comment fetch shows one error naming the source', async ({
  context,
  page,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    network: [
      {
        pattern: DDP_SEARCH_URL,
        respond: (route) => route.fulfill({ json: singleSearchResult() }),
      },
      {
        pattern: DDP_BANGUMI_URL,
        respond: (route) =>
          route.fulfill({ json: loadJsonFixture('ddp-bangumi.json') }),
      },
      {
        pattern: DDP_COMMENT_URL,
        respond: (route) => route.fulfill({ status: 500, body: 'down' }),
      },
    ],
  })
  await seedXPathIntegration(da, {
    patterns: [MOUNT_PATTERN],
    policy: buildFixtureIntegrationPolicy(),
  })
  await da.mount.waitForRegistration(MOUNT_PATTERN, 5_000)

  const integrationPage = new IntegrationPage(page)
  await page.bringToFront()
  await integrationPage.open(NATIVE_URL, 'native-video.html')

  const toast = new Toast(page)
  await toast.expectError(UNREACHABLE, { timeout: 15_000 })
  // A duplicate report would arrive just after the first, so let it render
  // before counting.
  await page.waitForTimeout(1_000)
  await expect(toast.bySeverity('error')).toHaveCount(1)
})
