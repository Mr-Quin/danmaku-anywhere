import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * The user manifest editor (#/providers/editor). Authoring from the Add menu
 * opens the editor on a valid starter manifest; saving registers it and
 * auto-imports it, so it appears in Installed with a Custom chip and a
 * provider config is persisted. Typing invalid JSON surfaces a parse error and
 * disables Save. Validation/registration run in the background; the assertions
 * here are user-visible.
 */

const STARTER_ID = 'user:new-source'

test('authoring a manifest saves and auto-imports it as a custom source', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
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

test('invalid JSON surfaces a parse error and disables saving', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/providers')

  await popup.providers.authorManifest()
  await popup.providers.setManifestJson('{ "apiVersion": 1, broken')

  await expect(popup.providers.manifestJsonError()).toBeVisible()
  await expect(popup.providers.saveButton()).toBeDisabled()
})
