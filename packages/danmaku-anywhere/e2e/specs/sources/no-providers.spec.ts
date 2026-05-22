import { expect } from '@playwright/test'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * No-providers guard: when every built-in source is disabled, a committed
 * search keyword must surface the searchPage.error.noProviders message
 * instead of falling through to the empty mascot. Asserts the dedicated
 * `search-no-providers` testid renders and that the message text appears
 * in either locale.
 */

test('search: noProviders error renders when all sources are disabled', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: {
      dandanplay: { enabled: false },
      bilibili: { enabled: false },
      tencent: { enabled: false },
    },
  })

  const popup = await Popup.open(page, extensionId)
  await popup.search.submit('frieren')

  const guard = page.locator('[data-testid="search-no-providers"]')
  await expect(guard).toBeVisible({ timeout: 5_000 })
  await expect(guard).toContainText(
    /No danmaku sources enabled|没有启用的弹幕来源/i
  )
})
