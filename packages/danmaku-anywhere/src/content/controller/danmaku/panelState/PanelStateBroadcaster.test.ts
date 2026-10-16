import type { CustomEpisode } from '@danmaku-anywhere/danmaku-converter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import {
  sendMount,
  sendUnmount,
} from '@/content/controller/common/danmakuCommands'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { useStore } from '@/content/controller/store/store'
import { startPanelStateBroadcaster } from './PanelStateBroadcaster'

/**
 * Drives the real controller store and records what the broadcaster sends to
 * each player frame. Asserts only a mounted entry is sent, only to the active
 * frame, that every other frame gets null, and that a change of active frame
 * re-sends even when the entry itself is unchanged.
 */

const syncPanelState = vi.hoisted(() => vi.fn())

vi.mock('@/common/rpcClient/background/client', () => ({
  playerRpcClient: {
    player: {
      'relay:command:syncPanelState': syncPanelState,
      'relay:command:mount': () => Promise.resolve({ data: true }),
      'relay:command:unmount': () => Promise.resolve({ data: true }),
    },
  },
}))

const initialState = useStore.getState()

const episode = {
  provider: DanmakuSourceType.MacCMS,
  title: 'Local file.xml',
  comments: [{ p: '1,1,16777215', m: 'hi', cid: 1 }],
  commentCount: 1,
  schemaVersion: 4,
  id: 1,
} as unknown as CustomEpisode // lint-specs-allow-cast: partial fixture, not a collaborator

function addStartedFrame(frameId: number) {
  const { frame } = useStore.getState()
  frame.addFrame({ frameId, url: `https://example.com/${frameId}` })
  frame.updateFrame(frameId, { started: true })
}

function sentTo(frameId: number) {
  return syncPanelState.mock.calls
    .filter(([payload]) => payload.frameId === frameId)
    .map(([payload]) => payload.data)
}

describe('PanelStateBroadcaster', () => {
  let stop: () => void

  beforeEach(() => {
    useStore.setState(initialState, true)
    syncPanelState.mockReset()
    addStartedFrame(0)
    addStartedFrame(1)
    useStore.getState().frame.setActiveFrame(0)
    stop = startPanelStateBroadcaster()
  })

  afterEach(() => {
    stop()
  })

  it('sends nothing but null before danmaku is mounted', () => {
    const { integration } = useStore.getState()
    integration.activate()
    integration.setMediaInfo(new MediaInfo({ title: 'Show', episode: 1 }))

    expect(syncPanelState).toHaveBeenCalled()
    for (const [payload] of syncPanelState.mock.calls) {
      expect(payload.data).toBeNull()
    }
  })

  it('sends the mounted entry to the active frame only', async () => {
    await sendMount([episode])

    expect(sentTo(0).at(-1)).toMatchObject({
      substate: 'mounted',
      commentCount: 1,
    })
    expect(sentTo(1).at(-1)).toBeNull()
  })

  it('moves the entry when the active frame changes', async () => {
    await sendMount([episode])
    syncPanelState.mockClear()

    useStore.getState().frame.setActiveFrame(1)

    expect(sentTo(0)).toEqual([null])
    expect(sentTo(1)).toEqual([
      expect.objectContaining({ substate: 'mounted' }),
    ])
  })

  it('clears every frame after an unmount', async () => {
    await sendMount([episode])
    syncPanelState.mockClear()

    await sendUnmount()

    expect(sentTo(0)).toEqual([null])
    expect(sentTo(1)).toEqual([null])
  })

  it('does not re-send while the hidden substate changes', () => {
    syncPanelState.mockClear()
    const { integration } = useStore.getState()

    integration.activate()
    integration.setMediaInfo(new MediaInfo({ title: 'Show', episode: 1 }))
    integration.setErrorMessage('boom')

    expect(syncPanelState).not.toHaveBeenCalled()
  })
})
