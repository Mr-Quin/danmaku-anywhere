import type {
  CommentEntity,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { concatArr } from '@/common/utils/utils'
import { DanmakuMountError } from '@/content/controller/common/hooks/mountError'
import { useStore } from '@/content/controller/store/store'

export type MountResult = { status: 'mounted' } | { status: 'cancelled' }

const CONTROLLER_SESSION = Date.now()

function orderOf(command: number) {
  return { session: CONTROLLER_SESSION, command }
}

function activeFrameId(): number | undefined {
  return useStore.getState().frame.getActiveFrame()?.frameId
}

// The frame showing the danmaku, which can differ from the active frame
// until the next mount moves them.
function mountedOrActiveFrameId(): number | undefined {
  return useStore.getState().danmaku.mountedFrameId ?? activeFrameId()
}

/**
 * Mounts the episodes in the active frame's player. A caller that gives up
 * through the signal gets 'cancelled' and never has its episodes recorded; if
 * the player already took them and nothing newer has been sent to that frame,
 * they are unmounted again. Each command carries its number, so the player
 * also applies them in the order they were sent.
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
    data: { comments, visible: isVisible, order: orderOf(command) },
  })
  if (!res.data) {
    throw new DanmakuMountError('mountFailed', 'Failed to mount danmaku')
  }

  const { commitMount, isLatestCommand } = useStore.getState().danmaku
  if (signal?.aborted) {
    if (isLatestCommand(frameId, command)) {
      await sendUnmount(frameId)
    }
    return { status: 'cancelled' }
  }

  const commit = commitMount(command, frameId, episodes)
  if (commit === 'recorded') {
    return { status: 'mounted' }
  }
  // Nothing would track these danmaku, so take them down.
  if (commit === 'superseded' && isLatestCommand(frameId, command)) {
    await sendUnmount(frameId)
  }
  return { status: 'cancelled' }
}

export async function sendUnmount(frameId = mountedOrActiveFrameId()) {
  if (frameId === undefined) {
    throw new Error('Trying to unmount danmaku without an active frame')
  }
  const command = useStore.getState().danmaku.issueCommand(frameId)
  await playerRpcClient.player['relay:command:unmount']({
    frameId,
    data: { order: orderOf(command) },
  })
  useStore.getState().danmaku.commitUnmount(command, frameId)
}

// The store holds what the user asked for, recorded before the player is
// told, so a mount sent in the meantime or later carries it even if this
// command never arrives.
export async function sendVisibility(visible: boolean) {
  const { toggleVisible, takeCommandNumber } = useStore.getState().danmaku
  toggleVisible(visible)
  const frameId = mountedOrActiveFrameId()
  if (frameId === undefined) {
    return
  }
  await playerRpcClient.player['relay:command:show']({
    frameId,
    data: { visible, order: orderOf(takeCommandNumber()) },
  })
}
