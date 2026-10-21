import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import { DanmakuMountError } from '@/content/controller/common/hooks/mountError'
import { useStore } from '@/content/controller/store/store'

export type MountResult = { status: 'mounted' } | { status: 'cancelled' }

// Players take this from the start and controllerReady handshakes and only
// apply commands carrying it.
export const CONTROLLER_SESSION = crypto.randomUUID()

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

// A caller that aborts gets 'cancelled' and nothing is recorded. If the player
// already took the episodes and nothing newer was sent to that frame, they are
// unmounted again.
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

  const comments = episodes.flatMap((episode) => episode.comments)

  const { issueCommand, isVisible } = useStore.getState().danmaku
  const command = issueCommand(frameId)
  const res = await playerRpcClient.player['relay:command:mount']({
    frameId,
    data: { comments, visible: isVisible, order: orderOf(command) },
  })
  // The player dropped it: it came from another controller session or a
  // newer mount or unmount already reached the player.
  if (!res.data) {
    return { status: 'cancelled' }
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
  const res = await playerRpcClient.player['relay:command:unmount']({
    frameId,
    data: { order: orderOf(command) },
  })
  if (res.data) {
    useStore.getState().danmaku.commitUnmount(command, frameId)
  }
}

// A user unmount also reaches a frame whose mount is still on its way, such
// as one moving the danmaku to a new active frame, which would otherwise be
// recorded after the unmount.
export async function sendUnmountEverywhere() {
  const targets = [...useStore.getState().frame.allFrames.values()]
    .filter((frame) => {
      return frame.mounted || frame.issuedCommand > frame.committedCommand
    })
    .map((frame) => frame.frameId)
  if (targets.length === 0) {
    await sendUnmount()
    return
  }
  await Promise.all(
    targets.map((frameId) => {
      return sendUnmount(frameId)
    })
  )
}

// The store holds what the user asked for, recorded before the players are
// told, so a mount sent in the meantime or later carries it even if this
// command never arrives. Every frame is told, since a mount can still be on
// its way to a frame other than the one recorded as showing danmaku.
export async function sendVisibility(visible: boolean) {
  const { danmaku, frame } = useStore.getState()
  danmaku.toggleVisible(visible)
  const order = orderOf(danmaku.takeCommandNumber())
  await Promise.allSettled(
    [...frame.allFrames.keys()].map((frameId) => {
      return playerRpcClient.player['relay:command:show']({
        frameId,
        data: { visible, order },
      })
    })
  )
}
