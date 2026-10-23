import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import { AppError } from '@/common/errors/AppError'
import { Logger } from '@/common/Logger'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type {
  ControllerSession,
  PlayerApplyCommand,
} from '@/common/rpcClient/background/types'
import { useStore } from '@/content/controller/store/store'

export type MountResult = { status: 'mounted' } | { status: 'cancelled' }

// Players take this from the start and controllerReady handshakes and only
// apply commands from the newest controller they have seen.
export const CONTROLLER_SESSION: ControllerSession = {
  id: crypto.randomUUID(),
  startedAt: Date.now(),
}

function commandFor(frameId: number, withContent: boolean): PlayerApplyCommand {
  const { version, contentVersion, isVisible, mountedFrameId, comments } =
    useStore.getState().danmaku
  const command = {
    session: CONTROLLER_SESSION.id,
    version,
    contentVersion,
    visible: isVisible,
  }
  if (!withContent) {
    return { ...command, content: { kind: 'keep' } }
  }
  if (frameId === mountedFrameId) {
    return { ...command, content: { kind: 'mount', comments } }
  }
  return { ...command, content: { kind: 'unmount' } }
}

// Every started frame is told, since an older mount can still be on its way
// to a frame that no longer shows the danmaku. Frames that have not started
// get the state in their handshake instead. Returns the delivery to `frameId`,
// the only one a caller waits for.
function broadcast(withContent: boolean, frameId?: number) {
  let delivery: Promise<unknown> = Promise.resolve()
  for (const frame of useStore.getState().frame.allFrames.values()) {
    if (!frame.started) {
      continue
    }
    const sent = playerRpcClient.player['relay:command:apply']({
      frameId: frame.frameId,
      data: commandFor(frame.frameId, withContent),
    })
    if (frame.frameId === frameId) {
      delivery = sent
    } else {
      sent.catch((error: unknown) => {
        Logger.debug('Failed to update a frame', error)
      })
    }
  }
  return delivery
}

// Moving the danmaku to a new active frame mounts the same episodes again,
// which keeps an earlier mount of them current.
function isStillMounted(episodes: GenericEpisode[]) {
  return useStore.getState().danmaku.episodes === episodes
}

export async function unmountQuietly() {
  try {
    await sendUnmount()
  } catch (error) {
    Logger.debug('Failed to unmount danmaku', error)
  }
}

// The store records the episodes before the players are told, so whatever
// is sent next carries them. A caller that aborts gets 'cancelled' and the
// episodes are unmounted again unless something newer replaced them.
export async function sendMount(
  episodes: GenericEpisode[],
  signal?: AbortSignal
): Promise<MountResult> {
  if (signal?.aborted) {
    return { status: 'cancelled' }
  }
  const frameId = useStore.getState().frame.getActiveFrame()?.frameId
  if (frameId === undefined) {
    throw new AppError(
      'mount.noActiveFrame',
      {},
      { message: 'No active frame to mount danmaku' }
    )
  }

  useStore.getState().danmaku.setContent({ episodes, frameId })
  let failure: { error: unknown } | undefined
  try {
    await broadcast(true, frameId)
  } catch (error) {
    failure = { error }
  }

  if (!isStillMounted(episodes)) {
    return { status: 'cancelled' }
  }
  if (signal?.aborted) {
    await unmountQuietly()
    return { status: 'cancelled' }
  }
  // After a move to another frame, this frame's answer no longer matters.
  if (failure && useStore.getState().danmaku.mountedFrameId === frameId) {
    await unmountQuietly()
    throw new AppError('mount.failed', {}, { cause: failure.error })
  }
  return { status: 'mounted' }
}

export async function sendUnmount() {
  const { mountedFrameId, setContent } = useStore.getState().danmaku
  setContent(undefined)
  await broadcast(true, mountedFrameId)
}

export async function sendVisibility(visible: boolean) {
  useStore.getState().danmaku.setVisible(visible)
  await broadcast(false)
}

// For a frame that just started, which missed everything sent before.
export async function syncFrame(frameId: number) {
  await playerRpcClient.player['relay:command:apply']({
    frameId,
    data: commandFor(frameId, true),
  })
}
