import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Importing a share code that is not one shows a translated "not valid" error
 * instead of the decoder's message, and keeps the dialog open with the pasted
 * text so it can be corrected. Asserts the toast, the open dialog and the
 * input value, and that no config was created.
 */

test('an invalid share code keeps the import dialog open', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const popup = await Popup.open(page, extensionId, '/config')
  await popup.config.importShareCode('definitely not a share code')
  await popup.dialog.confirm()

  await popup.toast.expectError(/This share code is not valid|分享码无效/)
  await expect(page.getByText(/base64/)).toBeHidden()
  await popup.dialog.expectVisible()
  await expect(popup.config.shareCodeInput()).toHaveValue(
    'definitely not a share code'
  )
  const stored = (await da.storage.get('sync', 'mountConfig')) as
    | { data?: unknown[] }
    | undefined
  expect(stored?.data ?? []).toEqual([])
})
