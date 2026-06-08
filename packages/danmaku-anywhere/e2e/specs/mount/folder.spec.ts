import { DanmakuSourceType } from '@danmaku-anywhere/danmaku-converter'
import { Popup } from '../../pom/Popup'
import { expect, test } from '../../setup/fixtures'
import { applyProfile } from '../../setup/profile'

/**
 * Folder rendering on the DanmakuTree (/mount). Folders are emergent from
 * custom-episode titles split on '/': two episodes titled `MyFolder/epN.xml`
 * group under a `folder-MyFolder` node. Walks Local Danmaku → folder →
 * children to assert each level renders.
 */

const FOLDER = 'MyFolder'

test('mount tree: custom episodes with shared path render under a folder node', async ({
  context,
  page,
  extensionId,
  da,
}) => {
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

  // `season-custom` is a synthetic id — there's no DB season for customs.
  await popup.mount.expandItem('season-custom')

  const folder = popup.mount.folderItem(FOLDER)
  await expect(folder).toBeVisible()

  await popup.mount.expandItem(`folder-${FOLDER}`)

  await expect(popup.mount.customEpisodeItem(ep1.id)).toBeVisible()
  await expect(popup.mount.customEpisodeItem(ep2.id)).toBeVisible()
})
