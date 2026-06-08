import type { Route } from '@playwright/test'
import { manifestStoreSeed, mockCatalog } from '../../network/catalog'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import type { NetworkMock } from '../../setup/profile'
import { applyProfile } from '../../setup/profile'

/**
 * A user-initiated catalog Refresh must bypass the backend edge cache. Drives
 * the Refresh button and asserts the user-visible signal (the bumped catalog
 * version appears), then asserts the catalog index request carried
 * Cache-Control: no-cache so the backend refetches instead of serving stale.
 */

const BUMPED = '9.9.9'

function recordingCatalog(
  ids: readonly string[],
  versionOverrides: Record<string, string>,
  indexCacheControls: string[]
): NetworkMock {
  const base = mockCatalog(ids, versionOverrides)
  return {
    pattern: base.pattern,
    respond: async (route: Route) => {
      const url = new URL(route.request().url())
      if (!url.pathname.endsWith('/manifest/file')) {
        const headers = await route.request().allHeaders()
        indexCacheControls.push(headers['cache-control'] ?? '')
      }
      await base.respond(route)
    },
  }
}

test('refresh: a user refresh forces a no-cache catalog fetch', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  const ids = ['dandanplay', 'bilibili', 'tencent', 'iqiyi']
  const indexCacheControls: string[] = []

  await applyProfile(context, da, {
    providers: {},
    rawStorage: [
      { area: 'local', key: 'manifests', value: manifestStoreSeed({}, ids) },
    ],
    network: [recordingCatalog(ids, { iqiyi: BUMPED }, indexCacheControls)],
  })

  const popup = await Popup.open(page, extensionId, '/providers')
  const iqiyiName = /iQIYI|爱奇艺/

  await popup.providers.refreshCatalog()

  await expect(popup.providers.catalogRow(iqiyiName)).toContainText(
    `v${BUMPED}`
  )

  expect(indexCacheControls).toContain('no-cache')
})
