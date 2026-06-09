import type { MountConfig } from '../../../src/common/options/mountConfig/schema'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Full CRUD lifecycle for a mount config driven entirely through the editor UI
 * (#/config -> /add -> /edit), the path that makes auto-mounting possible but
 * was previously only exercised via a pre-seeded config. Creates a manual-mode
 * config through the stepper, edits its name, then deletes it via the row menu.
 * Asserts the success toast and list row at each step, with the stored
 * `mountConfig` array as ground truth.
 */

test('mount config: create, edit, then delete through the editor UI', async ({
  context,
  page,
  extensionId,
  da,
}) => {
  await applyProfile(context, da, {})

  const storedNames = async (): Promise<string[]> => {
    const raw = (await da.storage.get('sync', 'mountConfig')) as
      | { data: MountConfig[] }
      | undefined
    return (raw?.data ?? []).map((config) => config.name)
  }

  const popup = await Popup.open(page, extensionId, '/config')

  await popup.config.startAdd()
  await popup.config.fillName('Alpha Config')
  await popup.config.addPattern('https://crud.e2e.invalid/*')
  await popup.config.next()
  await popup.config.save()

  await popup.toast.expectSuccess(/Config Created|配置已创建/)
  await popup.config.expectRow('Alpha Config')
  await expect.poll(storedNames).toContain('Alpha Config')

  await popup.config.openEditor('Alpha Config')
  await popup.config.fillName('Beta Config')
  await popup.config.next()
  await popup.config.save()

  await popup.toast.expectSuccess(/Config Updated|配置已更新/)
  await popup.config.expectRow('Beta Config')
  await expect(popup.config.row('Alpha Config')).toBeHidden()
  await expect.poll(storedNames).toEqual(['Beta Config'])

  await popup.config.openRowMenu('Beta Config', 'delete')
  await popup.dialog.confirm()

  await popup.toast.expectSuccess(/Config Deleted|配置已删除/)
  await expect(popup.config.row('Beta Config')).toBeHidden()
  await expect.poll(storedNames).toEqual([])
})
