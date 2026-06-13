import { providerTypeFromManifestId } from '@danmaku-anywhere/danmaku-converter'
import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { isSourceEpisode } from '@/common/danmaku/utils'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PipelineEntry } from '@/common/rpcClient/background/types'
import { useStore } from '@/content/controller/store/store'
import { setLatestPipelineEntry } from './latestPipelineEntry'
import { selectPanelState } from './selectPanelState'

function usePipelineEntry(): PipelineEntry | null {
  const isDisconnected = useStore.use.isDisconnected()
  const { isManual, isMounted, episodes, comments } = useStore.use.danmaku()
  const integration = useStore.use.integration()

  return useMemo<PipelineEntry | null>(() => {
    const firstEpisode = episodes?.[0]
    const provider =
      firstEpisode && isSourceEpisode(firstEpisode)
        ? providerTypeFromManifestId(firstEpisode.season.manifestId ?? '')
        : undefined
    return selectPanelState({
      isDisconnected,
      isManual,
      isMounted,
      commentCount: comments.length,
      provider,
      mountedEpisodes: episodes,
      integration: {
        active: integration.active,
        errorMessage: integration.errorMessage,
        mediaInfo: integration.mediaInfo,
      },
    })
  }, [
    isDisconnected,
    isManual,
    isMounted,
    comments.length,
    episodes,
    integration.active,
    integration.errorMessage,
    integration.mediaInfo,
  ])
}

export function PanelStateBroadcaster() {
  const entry = usePipelineEntry()
  const startedFrameIds = useStore(
    useShallow((s) => {
      const ids: number[] = []
      for (const frame of s.frame.allFrames.values()) {
        if (frame.started) {
          ids.push(frame.frameId)
        }
      }
      return ids
    })
  )

  useEffect(() => {
    setLatestPipelineEntry(entry)
    for (const frameId of startedFrameIds) {
      void playerRpcClient.player['relay:command:syncPanelState'](
        { frameId, data: entry },
        { optional: true, silent: true }
      )
    }
  }, [entry, startedFrameIds])

  return null
}
