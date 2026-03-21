import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/common/rpcClient/background/client', () => ({
  playerRpcClient: {
    player: {
      'relay:command:seek': vi.fn(),
      'relay:command:debugSkipButton': vi.fn(),
    },
  },
}))

import { playerRpcClient } from '@/common/rpcClient/background/client'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { useStore } from './store'

function resetStore() {
  const state = useStore.getState()
  state.integration.deactivate()
  state.integration.resetIntegration()

  // Clear all frames
  const allFrames = useStore.getState().frame.allFrames
  for (const frameId of allFrames.keys()) {
    useStore.getState().frame.removeFrame(frameId)
  }
}

describe('integration slice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('activate() sets active to true', () => {
    useStore.getState().integration.activate()
    expect(useStore.getState().integration.active).toBe(true)
  })

  it('deactivate() sets active to false', () => {
    useStore.getState().integration.activate()
    useStore.getState().integration.deactivate()
    expect(useStore.getState().integration.active).toBe(false)
  })

  it('setMediaInfo() stores the MediaInfo', () => {
    const info = new MediaInfo({ title: 'Test Anime', episode: 3 })
    useStore.getState().integration.setMediaInfo(info)
    const stored = useStore.getState().integration.mediaInfo
    expect(stored).toBeDefined()
    expect(stored!.title).toBe('Test Anime')
    expect(stored!.episode).toBe(3)
  })

  it('setFoundElements(true) sets foundElements to true', () => {
    useStore.getState().integration.setFoundElements(true)
    expect(useStore.getState().integration.foundElements).toBe(true)
  })

  it('setFoundElements(false) sets foundElements to false', () => {
    useStore.getState().integration.setFoundElements(true)
    useStore.getState().integration.setFoundElements(false)
    expect(useStore.getState().integration.foundElements).toBe(false)
  })

  it('setErrorMessage() sets error message', () => {
    useStore.getState().integration.setErrorMessage('something went wrong')
    expect(useStore.getState().integration.errorMessage).toBe(
      'something went wrong'
    )
  })

  it('setErrorMessage() with no arg clears error message', () => {
    useStore.getState().integration.setErrorMessage('error')
    useStore.getState().integration.setErrorMessage()
    expect(useStore.getState().integration.errorMessage).toBeUndefined()
  })

  it('resetIntegration() clears mediaInfo, foundElements, and errorMessage', () => {
    const info = new MediaInfo({ title: 'Reset Test' })
    useStore.getState().integration.setMediaInfo(info)
    useStore.getState().integration.setFoundElements(true)
    useStore.getState().integration.setErrorMessage('err')

    useStore.getState().integration.resetIntegration()

    const state = useStore.getState().integration
    expect(state.mediaInfo).toBeUndefined()
    expect(state.foundElements).toBe(false)
    expect(state.errorMessage).toBeUndefined()
  })

  it('resetIntegration() is idempotent', () => {
    useStore.getState().integration.resetIntegration()
    useStore.getState().integration.resetIntegration()

    const state = useStore.getState().integration
    expect(state.mediaInfo).toBeUndefined()
    expect(state.foundElements).toBe(false)
    expect(state.errorMessage).toBeUndefined()
  })
})

describe('frame + hasVideo derived state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('hasVideo() returns false when no activeFrame', () => {
    expect(useStore.getState().hasVideo()).toBe(false)
  })

  it('hasVideo() returns false when activeFrame.hasVideo is false', () => {
    useStore.getState().frame.addFrame({ frameId: 1, url: 'http://test' })
    useStore.getState().frame.setActiveFrame(1)
    expect(useStore.getState().hasVideo()).toBe(false)
  })

  it('hasVideo() returns true when activeFrame.hasVideo is true', () => {
    useStore.getState().frame.addFrame({ frameId: 1, url: 'http://test' })
    useStore.getState().frame.setActiveFrame(1)
    useStore.getState().frame.updateFrame(1, { hasVideo: true })
    expect(useStore.getState().hasVideo()).toBe(true)
  })

  it('getActiveFrame() returns undefined when no active frame', () => {
    expect(useStore.getState().frame.getActiveFrame()).toBeUndefined()
  })

  it('getActiveFrame() returns the active frame when set', () => {
    useStore.getState().frame.addFrame({ frameId: 42, url: 'http://example' })
    useStore.getState().frame.setActiveFrame(42)
    const active = useStore.getState().frame.getActiveFrame()
    expect(active).toBeDefined()
    expect(active!.frameId).toBe(42)
    expect(active!.url).toBe('http://example')
  })
})

describe('seekToTime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('no-ops when no active frame', () => {
    useStore.getState().seekToTime(10)
    expect(playerRpcClient.player['relay:command:seek']).not.toHaveBeenCalled()
  })

  it('calls RPC when active frame exists', () => {
    useStore.getState().frame.addFrame({ frameId: 5, url: 'http://video' })
    useStore.getState().frame.setActiveFrame(5)
    useStore.getState().seekToTime(42)
    expect(playerRpcClient.player['relay:command:seek']).toHaveBeenCalledWith({
      frameId: 5,
      data: 42,
    })
  })
})
