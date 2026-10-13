import type {
  CommentEntity,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { concatArr } from '@/common/utils/utils'
import { DanmakuMountError } from '@/content/controller/common/hooks/mountError'
import { useStore } from '@/content/controller/store/store'

export type MountResult = { status: 'mounted' } | { status: 'cancelled' }

function activeFrameId(): number | undefined {
  return useStore.getState().frame.getActiveFrame()?.frameId
}

/**
 * Mounts the episodes in the active frame's player. A caller that gives up
 * through the signal gets 'cancelled' and never has its episodes recorded; if
 * the player already took them and nothing newer has been sent to that frame,
 * they are unmounted again.
 *
 * Commands to one frame are assumed to reach its player in the order they are
 * sent. The background relay awaits a tabs.query before each sendMessage, so
 * this holds in practice but nothing enforces it.
 */
export async function sendMount(
  episodes: GenericEpisode[],
  signal?: AbortSignal
): Promise<MountResult> {
  if (signal?.aborted) {
    return { status: 'cancelled' }
  }
  const frameId = activeFrameId()
  if (frameId === undefined) {
    throw new DanmakuMountError(
      'noActiveFrame',
      'No active frame to mount danmaku'
    )
  }

  const comments: CommentEntity[] = []
  episodes.forEach((episode) => {
    concatArr(comments, episode.comments)
  })

  const { issueCommand, isVisible } = useStore.getState().danmaku
  const command = issueCommand(frameId)
  const res = await playerRpcClient.player['relay:command:mount']({
    frameId,
    data: { comments, visible: isVisible },
  })
  if (!res.data) {
    throw new DanmakuMountError('mountFailed', 'Failed to mount danmaku')
  }

  if (signal?.aborted) {
    if (useStore.getState().danmaku.isLatestCommand(frameId, command)) {
      await sendUnmount(frameId)
    }
    return { status: 'cancelled' }
  }

  useStore.getState().danmaku.commitMount(command, frameId, episodes)
  return { status: 'mounted' }
}

export async function sendUnmount(frameId = activeFrameId()) {
  if (frameId === undefined) {
    throw new Error('Trying to unmount danmaku without an active frame')
  }
  const command = useStore.getState().danmaku.issueCommand(frameId)
  await playerRpcClient.player['relay:command:unmount']({ frameId })
  useStore.getState().danmaku.commitUnmount(command, frameId)
}

// Records the choice before telling the player, so a mount sent in the
// meantime already carries it.
export async function sendVisibility(visible: boolean) {
  const frameId = activeFrameId()
  if (frameId === undefined) {
    throw new Error('No active frame')
  }
  const { isVisible: previous, toggleVisible } = useStore.getState().danmaku
  toggleVisible(visible)
  try {
    await playerRpcClient.player['relay:command:show']({
      frameId,
      data: visible,
    })
  } catch (error) {
    toggleVisible(previous)
    throw error
  }
}
