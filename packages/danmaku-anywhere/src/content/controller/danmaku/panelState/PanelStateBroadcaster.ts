import { episodeProviderType } from '@/common/danmaku/utils'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PipelineEntry } from '@/common/rpcClient/background/types'
import { useStore } from '@/content/controller/store/store'
import { setLatestPipelineEntry } from './latestPipelineEntry'
import { panelEntriesEqual } from './panelEntryEqual'
import { panelEntryForFrame, shownPipelineEntry } from './panelEntryForFrame'
import { selectPanelState } from './selectPanelState'

type StoreState = ReturnType<typeof useStore.getState>

interface Broadcast {
  entry: PipelineEntry | null
  activeFrameId: number | undefined
}

function sameBroadcast(a: Broadcast, b: Broadcast): boolean {
  if (a.activeFrameId !== b.activeFrameId) {
    return false
  }
  if (a.entry === null || b.entry === null) {
    return a.entry === b.entry
  }
  return panelEntriesEqual(a.entry, b.entry)
}

class PanelStateBroadcaster {
  #prev: Broadcast | null = null

  start(): () => void {
    this.#sync(useStore.getState())
    return useStore.subscribe((state) => this.#sync(state))
  }

  #sync(state: StoreState): void {
    const { isDisconnected, danmaku, integration } = state
    const firstEpisode = danmaku.episodes?.[0]
    const provider = firstEpisode
      ? episodeProviderType(firstEpisode)
      : undefined
    const entry = selectPanelState({
      isDisconnected,
      isManual: danmaku.isManual,
      isMounted: danmaku.isMounted,
      commentCount: danmaku.comments.length,
      provider,
      mountedEpisodes: danmaku.episodes,
      integration: {
        active: integration.active,
        errorMessage: integration.errorMessage,
        mediaInfo: integration.mediaInfo,
      },
    })

    setLatestPipelineEntry(entry)

    const activeFrameId = state.frame.activeFrame?.frameId
    const next = { entry: shownPipelineEntry(entry), activeFrameId }
    if (this.#prev && sameBroadcast(this.#prev, next)) {
      return
    }
    this.#prev = next

    for (const frame of state.frame.allFrames.values()) {
      if (frame.started) {
        void playerRpcClient.player['relay:command:syncPanelState'](
          {
            frameId: frame.frameId,
            data: panelEntryForFrame(entry, frame.frameId, activeFrameId),
          },
          { optional: true, silent: true }
        )
      }
    }
  }
}

export function startPanelStateBroadcaster(): () => void {
  return new PanelStateBroadcaster().start()
}
