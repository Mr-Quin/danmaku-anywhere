import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import type { ProviderConfig } from '../../../src/common/options/providerConfig/schema'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Two configs sharing the DanDanPlay manifestId collapse into one Installed
 * group: the row shows an instance count, both instances are listed, and an
 * Add instance affordance is present. Asserts the grouped UI plus the two
 * persisted configs as ground truth.
 */

const homeServer: ProviderConfig = {
  id: 'home-ddp',
  manifestId: 'dandanplay',
  name: 'Home NAS',
  impl: DanmakuSourceType.DanDanPlay,
  enabled: true,
  configValues: {
    baseUrl: 'https://ddp.home.invalid',
    auth: { enabled: false, headers: [] },
  },
}

test('installed: multiple dandanplay configs group into instances', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {
    providers: { dandanplay: { enabled: true } },
    customProviders: [homeServer],
  })

  await Popup.open(page, extensionId, '/providers')

  await expect(page.getByText(/2 instances|2 个实例/)).toBeVisible()
  await expect(page.getByText('Home NAS')).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^(Add instance|添加实例)$/ })
  ).toBeVisible()

  const ddp = (await da.providerConfig.list()).filter(
    (config) => config.manifestId === 'dandanplay'
  )
  expect(ddp).toHaveLength(2)
})
