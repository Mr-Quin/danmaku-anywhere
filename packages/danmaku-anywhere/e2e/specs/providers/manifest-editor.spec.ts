import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * The user manifest editor (#/providers/editor). Authoring from the Add menu
 * opens the editor on a valid starter manifest; saving registers it and
 * auto-imports it, so it appears in Installed with a Custom chip and a
 * provider config is persisted. Deleting the custom source (confirm dialog)
 * removes it from the page entirely along with its config. Typing invalid
 * JSON surfaces a parse error and disables Save.
 */

const STARTER_ID = 'user:new-source'

test('authoring a manifest saves and auto-imports it as a custom source', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/providers')

  await popup.providers.authorManifest()
  await expect(popup.providers.manifestValid()).toBeVisible()

  await popup.providers.save()
  await popup.toast.expectSuccess(/Manifest saved|配置已保存/)

  await expect(popup.providers.row('New Source')).toBeVisible()
  await expect(popup.providers.customChip()).toBeVisible()

  const configs = await da.providerConfig.list()
  expect(configs.some((config) => config.manifestId === STARTER_ID)).toBe(true)
})

test('deleting a custom source removes the manifest and its config', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/providers')

  await popup.providers.authorManifest()
  await expect(popup.providers.manifestValid()).toBeVisible()
  await popup.providers.save()
  await expect(popup.providers.row('New Source')).toBeVisible()

  await popup.providers.deleteProvider('New Source')
  await popup.dialog.expectTitle(/Delete custom source|删除自定义源/)
  await popup.dialog.confirm()

  await popup.toast.expectSuccess(/Provider deleted|弹幕源已删除/)
  // Gone entirely: not reachable from Installed nor the catalog section.
  await expect(popup.providers.row('New Source')).toBeHidden()

  const configs = await da.providerConfig.list()
  expect(configs.some((config) => config.manifestId === STARTER_ID)).toBe(false)
})

test('invalid JSON surfaces a parse error and disables saving', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/providers')

  await popup.providers.authorManifest()
  await popup.providers.setManifestJson('{ "apiVersion": 1, broken')

  await expect(popup.providers.manifestJsonError()).toBeVisible()
  await expect(popup.providers.saveButton()).toBeDisabled()
})
