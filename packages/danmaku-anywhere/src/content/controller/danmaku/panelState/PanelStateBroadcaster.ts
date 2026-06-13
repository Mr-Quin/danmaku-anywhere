import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PipelineEntry } from '@/common/rpcClient/background/types'
import { useStore } from '@/content/controller/store/store'
import { setLatestPipelineEntry } from './latestPipelineEntry'
import { panelEntriesEqual } from './panelEntryEqual'
import { selectPanelState } from './selectPanelState'

type StoreState = ReturnType<typeof useStore.getState>

class PanelStateBroadcaster {
  #prevEntry: PipelineEntry | null = null

  start(): () => void {
    this.#sync(useStore.getState())
    return useStore.subscribe((state) => this.#sync(state))
  }

  #sync(state: StoreState): void {
    const { isDisconnected, danmaku, integration } = state
    const entry = selectPanelState({
      isDisconnected,
      isManual: danmaku.isManual,
      isMounted: danmaku.isMounted,
      commentCount: danmaku.comments.length,
      provider: danmaku.episodes?.[0]?.provider,
      mountedEpisodes: danmaku.episodes,
      integration: {
        active: integration.active,
        errorMessage: integration.errorMessage,
        mediaInfo: integration.mediaInfo,
      },
    })

    const startedFrameIds: number[] = []
    for (const frame of state.frame.allFrames.values()) {
      if (frame.started) {
        startedFrameIds.push(frame.frameId)
      }
    }

    setLatestPipelineEntry(entry)

    if (this.#prevEntry !== null && panelEntriesEqual(this.#prevEntry, entry)) {
      return
    }
    this.#prevEntry = entry

    for (const frameId of startedFrameIds) {
      void playerRpcClient.player['relay:command:syncPanelState'](
        { frameId, data: entry },
        { optional: true, silent: true }
      )
    }
  }
}

export function startPanelStateBroadcaster(): () => void {
  return new PanelStateBroadcaster().start()
}
