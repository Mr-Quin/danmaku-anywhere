import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { Popup } from '../../pom/Popup'
import { getDaClient } from '../../setup/da-client'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Folder rendering in the DanmakuTree (/mount). Folders are derived from
 * custom episode titles split on '/': a title like
 * `MyFolder/ep1.xml` produces a `folder-MyFolder` node grouping the
 * matching `custom-episode-{id}` rows under the "Local Danmaku" root.
 *
 * The spec seeds two custom episodes sharing a folder prefix via the
 * dev API (no drag/drop, since folders are emergent from titles —
 * there is no separate "create folder" call), then walks the tree:
 * Local Danmaku → folder → child episodes.
 */

const FOLDER = 'MyFolder'

test('mount tree: custom episodes with shared path render under a folder node', async ({
  context,
  page,
  extensionId,
}) => {
  const da = await getDaClient(context)
  await applyProfile(context, da, {})

  const ep1 = await da.episode.addCustom({
    provider: DanmakuSourceType.MacCMS,
    title: `${FOLDER}/ep1.xml`,
    comments: [],
    commentCount: 0,
    schemaVersion: 4,
  })
  const ep2 = await da.episode.addCustom({
    provider: DanmakuSourceType.MacCMS,
    title: `${FOLDER}/ep2.xml`,
    comments: [],
    commentCount: 0,
    schemaVersion: 4,
  })

  const popup = await Popup.open(page, extensionId, '/mount')

  // The custom-episode root uses a synthetic `season-custom` id rather
  // than a DB season id.
  await popup.mount.expandItem('season-custom')

  const folder = popup.mount.folderItem(FOLDER)
  await expect(folder).toBeVisible({ timeout: 10_000 })

  await popup.mount.expandItem(`folder-${FOLDER}`)

  await expect(popup.mount.customEpisodeItem(ep1.id)).toBeVisible({
    timeout: 10_000,
  })
  await expect(popup.mount.customEpisodeItem(ep2.id)).toBeVisible({
    timeout: 10_000,
  })
})
