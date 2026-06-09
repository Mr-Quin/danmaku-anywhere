import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { loadJsonFixture } from '../../setup/fixtures-loader'
import { applyProfile } from '../../setup/profile'

/**
 * Search loading state. While a search is in flight the result-count line
 * renders a skeleton rather than a blank gap above the row skeletons, and
 * resolves to the "{n} results" count. When a search errors, clicking Retry
 * flips back to the loading skeleton instead of staying on the error UI.
 */

function deferredGate(): { wait: Promise<void>; release: () => void } {
  let release!: () => void
  const wait = new Promise<void>((resolve) => {
    release = resolve
  })
  return { wait, release }
}

test('loading shows a result-count skeleton, then the result count', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  const gate = deferredGate()

  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    network: [
      {
        pattern: /\/ddp\/api\/v2\/search\/anime/,
        respond: async (route) => {
          await gate.wait
          await route.fulfill({ json: loadJsonFixture('ddp-search.json') })
        },
      },
    ],
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')

  await expect(popup.search.resultCountSkeleton).toBeVisible()
  await expect(popup.search.resultRowSkeleton).toBeVisible()

  gate.release()

  await expect(popup.search.seasonCard('DanDanPlay')).toBeVisible()
  await expect(popup.search.resultCountSkeleton).toBeHidden()
  await expect(popup.search.resultCount(2)).toBeVisible()
})

// The retry path deliberately drives a failed search; the RPC layer logs the
// HTTP 500 from both the worker and the popup.
test.describe(() => {
  test.use({
    expectedConsoleErrors: [/\[RpcManager\] Error in RPC handler.*HTTP 500/],
  })

  test('retry on a failed search returns to the loading skeleton', async ({
    context,
    page,
    extensionId,
    da,
  }) => {
    let calls = 0
    const retryGate = deferredGate()

    await applyProfile(context, da, {
      providers: { dandanplay: { enabled: true } },
      network: [
        {
          pattern: /\/ddp\/api\/v2\/search\/anime/,
          respond: async (route) => {
            calls += 1
            if (calls === 1) {
              await route.fulfill({ status: 500, body: 'search failed' })
              return
            }
            await retryGate.wait
            await route.fulfill({ json: loadJsonFixture('ddp-search.json') })
          },
        },
      ],
    })

    const popup = await Popup.open(page, extensionId)
    await popup.search.submit('frieren')

    await expect(popup.search.retryButton).toBeVisible()

    await popup.search.retryButton.click()

    await expect(popup.search.resultRowSkeleton).toBeVisible()
    await expect(popup.search.retryButton).toBeHidden()

    retryGate.release()

    await expect(popup.search.seasonCard('DanDanPlay')).toBeVisible()
  })
})
