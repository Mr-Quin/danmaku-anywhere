import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * The user manifest editor (#/providers/editor). Authoring from the Add menu
 * opens the editor on a valid starter manifest; saving registers it as a user
 * source that appears in the catalog and reopens (via View source) in editable
 * form. Typing invalid JSON surfaces a parse error and disables Save. Validation
 * and registration run in the background; the assertions here are user-visible.
 */

const STARTER_ID = 'user:new-source'

test('authoring a manifest saves it and reopens its source', async ({
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
  await popup.toast.expectSuccess(/Manifest saved|清单已保存/)

  await expect(popup.providers.catalogRow('New Source')).toBeVisible()

  await popup.providers.viewSource('New Source')
  await expect(popup.providers.manifestJsonField()).toHaveValue(
    new RegExp(STARTER_ID)
  )
  await expect(popup.providers.saveButton()).toBeVisible()
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
