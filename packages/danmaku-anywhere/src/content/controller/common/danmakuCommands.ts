import type {
  CommentEntity,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { concatArr } from '@/common/utils/utils'
import { DanmakuMountError } from '@/content/controller/common/hooks/mountError'
import { useStore } from '@/content/controller/store/store'

export type MountResult =
  | { status: 'mounted'; frameId: number }
  | { status: 'cancelled' }

/**
 * Mounts the episodes in the active frame's player. A caller that gives up
 * through the signal gets 'cancelled' and never has its episodes recorded; if
 * the player already took them and nothing has been sent since, they are
 * unmounted again.
 */
export async function sendMount(
  episodes: GenericEpisode[],
  signal?: AbortSignal
): Promise<MountResult> {
  if (signal?.aborted) {
    return { status: 'cancelled' }
  }
  const activeFrame = useStore.getState().frame.getActiveFrame()
  if (!activeFrame) {
    throw new DanmakuMountError(
      'noActiveFrame',
      'No active frame to mount danmaku'
    )
  }
  const { frameId } = activeFrame

  const comments: CommentEntity[] = []
  episodes.forEach((episode) => {
    concatArr(comments, episode.comments)
  })

  const command = useStore.getState().danmaku.issueCommand()
  const res = await playerRpcClient.player['relay:command:mount']({
    frameId,
    data: comments,
  })
  if (!res.data) {
    throw new DanmakuMountError('mountFailed', 'Failed to mount danmaku')
  }

  if (signal?.aborted) {
    if (useStore.getState().danmaku.lastCommand === command) {
      await sendUnmount(frameId)
    }
    return { status: 'cancelled' }
  }

  // A fresh mount renders visible, so carry over a hide the user asked for.
  if (!useStore.getState().danmaku.isVisible) {
    await playerRpcClient.player['relay:command:show']({
      frameId,
      data: false,
    })
  }

  useStore.getState().danmaku.commitMount(command, frameId, episodes)
  return { status: 'mounted', frameId }
}

export async function sendUnmount(frameId?: number) {
  const target = frameId ?? useStore.getState().frame.getActiveFrame()?.frameId
  if (target === undefined) {
    throw new Error('Trying to unmount danmaku without an active frame')
  }
  const command = useStore.getState().danmaku.issueCommand()
  await playerRpcClient.player['relay:command:unmount']({ frameId: target })
  useStore.getState().danmaku.commitUnmount(command, target)
}
