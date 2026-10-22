import { IntegrationPage } from '../../pom/IntegrationPage'
import { SearchPage } from '../../pom/SearchPage'
import { Toast } from '../../pom/Toast'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import {
  buildFixtureIntegrationPolicy,
  seedXPathIntegration,
} from '../../setup/integration'
import { applyProfile } from '../../setup/profile'

/**
 * The in-page search follows the show on the page. After the user searched
 * something of their own for a show automatic matching could not find, a
 * different show that also goes unmatched opens the search with its own title
 * and its own results, not the earlier search. Asserts the search box and
 * which results are shown.
 */

const ORIGIN = 'https://da-test.invalid'
const NATIVE_URL = `${ORIGIN}/native/`
const MOUNT_PATTERN = `${ORIGIN}/*`

const DDP_SEARCH_URL = /\/ddp\/api\/v2\/search\/anime/
const OPEN_SEARCH = /^(Open search page|打开搜索页面)$/

function notFoundFor(title: string) {
  return new RegExp(`(No episode found for|未找到匹配的剧集：)${title}`)
}

test('a different unmatched show opens the search for itself', async ({
  context,
  page,
  da,
}) => {
  const search = loadJsonFixture('ddp-search.json') as { animes: unknown[] }
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    network: [
      {
        pattern: DDP_SEARCH_URL,
        respond: (route) => {
          const keyword = new URL(route.request().url()).searchParams.get(
            'keyword'
          )
          const animes = keyword === 'frieren' ? search.animes : []
          return route.fulfill({ json: { ...search, animes } })
        },
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
  const searchPage = new SearchPage(page)

  await toast.expectError(notFoundFor('DA Integration Test'), {
    timeout: 15_000,
  })
  await toast
    .bySeverity('error')
    .getByRole('button', { name: OPEN_SEARCH })
    .click()
  await expect(searchPage.input).toHaveValue('DA Integration Test')
  await searchPage.submit('frieren')
  await expect(searchPage.seasonCard('DanDanPlay')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(integrationPage.controllerWindow()).toBeHidden()

  await integrationPage.setTitleText('Another Show')
  await toast.expectError(notFoundFor('Another Show'), { timeout: 15_000 })
  await toast
    .bySeverity('error')
    .filter({ hasText: 'Another Show' })
    .getByRole('button', { name: OPEN_SEARCH })
    .click()

  await expect(searchPage.input).toHaveValue('Another Show')
  await expect(searchPage.seasonCard('DanDanPlay')).toBeHidden()
})
