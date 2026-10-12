import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * The built-in AI provider has nothing to configure, so its row says so and
 * clicking it does not open an editor. Asserts the row hint and that the
 * provider list stays on screen.
 */

test('the built-in AI provider row is not editable', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  await Popup.open(page, extensionId, '/ai-providers')
  const row = page.getByText(/^(Danmaku Anywhere AI|弹幕任何地方AI)$/)
  await expect(row).toBeVisible()

  await row.click()

  await expect(page.getByText(/^(Edit Provider|编辑AI源)$/)).toBeHidden()
  await expect(row).toBeVisible()
  await expect(
    page.getByText(/Provided by Danmaku Anywhere|由弹幕任何地方提供/)
  ).toBeVisible()
})
