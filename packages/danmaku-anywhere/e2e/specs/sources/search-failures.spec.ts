import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Search and URL-parse failures leave the user somewhere to go. An
 * unreachable source reads as a localized connection error, not the raw
 * "Failed to fetch". Pressing Search again on the same keyword retries a
 * failed source. A source whose login probe says logged-out and whose search
 * came back empty asks for a sign-in instead of claiming there are no results.
 * A failed URL parse stays on screen with Retry and a way back to searching.
 */

const NAV_URL = /api\.bilibili\.com\/x\/web-interface\/nav/
const WBI_SEARCH_URL = /api\.bilibili\.com\/x\/web-interface\/wbi\/search\/type/
const BILIBILI_SEASON_URL = /api\.bilibili\.com\/pgc\/view\/web\/season/
const DDP_SEARCH_URL = /\/ddp\/api\/v2\/search\/anime/

const LOGGED_OUT_NAV = {
  code: -101,
  message: '账号未登录',
  data: {
    isLogin: false,
    wbi_img: {
      img_url:
        'https://i0.hdslb.com/bfs/wbi/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
      sub_url:
        'https://i0.hdslb.com/bfs/wbi/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png',
    },
  },
}

test.describe('unreachable source', () => {
  test.use({
    expectedConsoleErrors: [
      /\[RpcManager\] Error in RPC handler.*Failed to fetch/,
    ],
  })

  test('shows a localized connection error instead of the raw fetch error', async ({
    context,
    page,
    extensionId,
    da,
  }) => {
    await applyProfile(context, da, {
      providers: { dandanplay: { enabled: true } },
      network: [
        {
          pattern: DDP_SEARCH_URL,
          respond: (route) => route.abort('failed'),
        },
      ],
    })

    const popup = await Popup.open(page, extensionId)
    await popup.search.submit('frieren')

    await expect(
      page.getByText(
        /Couldn't reach .+\. Check your connection|无法连接.+请检查网络/
      )
    ).toBeVisible()
    await expect(page.getByText('Failed to fetch')).toHaveCount(0)
    await expect(popup.search.retryButton).toBeVisible()
  })
})

test.describe('repeated search', () => {
  test.use({
    expectedConsoleErrors: [/\[RpcManager\] Error in RPC handler.*HTTP 500/],
  })

  test('pressing Search again on the same keyword retries a failed source', async ({
    context,
    page,
    extensionId,
    da,
  }) => {
    let calls = 0
    await applyProfile(context, da, {
      providers: { dandanplay: { enabled: true } },
      network: [
        {
          pattern: DDP_SEARCH_URL,
          respond: async (route) => {
            calls += 1
            if (calls === 1) {
              await route.fulfill({ status: 500, body: 'search failed' })
              return
            }
            await route.fulfill({ json: loadJsonFixture('ddp-search.json') })
          },
        },
      ],
    })

    const popup = await Popup.open(page, extensionId)
    await popup.search.submit('frieren')
    await expect(popup.search.retryButton).toBeVisible()

    await popup.search.submit('frieren')

    await expect(popup.search.seasonCard('DanDanPlay')).toBeVisible()
    expect(calls).toBe(2)
  })
})

test('a logged-out source with no results asks for a sign-in', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {
    providers: { bilibili: { enabled: true } },
    network: [
      {
        pattern: NAV_URL,
        respond: (route) => route.fulfill({ json: LOGGED_OUT_NAV }),
      },
      {
        pattern: WBI_SEARCH_URL,
        respond: (route) =>
          route.fulfill({
            json: { code: 0, data: { numResults: 0, result: [] } },
          }),
      },
    ],
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')

  await expect(
    page.getByText(/needs you to sign in to search|需要登录才能搜索/)
  ).toBeVisible()
  await expect(page.getByTestId('search-sign-in')).toHaveAttribute(
    'href',
    /^https:\/\/.*bilibili\.com/
  )
  await expect(page.getByText(/No results found|没有找到结果/)).toHaveCount(0)
})

test.describe('url parse failure', () => {
  test.use({
    expectedConsoleErrors: [/\[RpcManager\] Error in RPC handler/],
  })

  test('keeps the failure on screen with retry and search instead', async ({
    context,
    page,
    extensionId,
    da,
  }) => {
    await applyProfile(context, da, {
      providers: { bilibili: { enabled: true } },
      network: [
        {
          pattern: BILIBILI_SEASON_URL,
          respond: (route) =>
            route.fulfill({ status: 500, body: 'season failed' }),
        },
      ],
    })

    const popup = await Popup.open(page, extensionId)
    await popup.search.submitUrl(
      'https://www.bilibili.com/bangumi/play/ss41410'
    )

    const failure = page.getByTestId('parse-error')
    await expect(failure).toContainText(
      /Couldn't parse this URL|无法解析此链接/
    )
    await expect(page.getByText(/URL detected|检测到链接/)).toHaveCount(0)
    await expect(
      failure.getByRole('button', { name: /^(Retry|重试)$/ })
    ).toBeVisible()

    await failure
      .getByRole('button', { name: /Search by title instead|改为按标题搜索/ })
      .click()
    await expect(popup.search.input).toHaveValue('')
    await expect(failure).toBeHidden()
  })
})
