import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { PanelStateSnapshot } from '@/common/rpcClient/background/types'
import { useStore } from '@/content/controller/store/store'
import { selectPanelState } from './selectPanelState'

function usePanelStateSnapshot(): PanelStateSnapshot {
  const { data: options } = useExtensionOptions()
  const isDisconnected = useStore.use.isDisconnected()
  const { isManual, isMounted, episodes, comments } = useStore.use.danmaku()
  const integration = useStore.use.integration()

  return useMemo<PanelStateSnapshot>(() => {
    return selectPanelState({
      enabled: options.infoPanel.enabled,
      isDisconnected,
      isManual,
      isMounted,
      commentCount: comments.length,
      provider: episodes?.[0]?.provider,
      integration: {
        active: integration.active,
        errorMessage: integration.errorMessage,
        mediaInfo: integration.mediaInfo,
      },
    })
  }, [
    options.infoPanel.enabled,
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
  const snapshot = usePanelStateSnapshot()
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
    for (const frameId of startedFrameIds) {
      void playerRpcClient.player['relay:command:syncPanelState'](
        { frameId, data: snapshot },
        { optional: true, silent: true }
      )
    }
  }, [snapshot, startedFrameIds])

  return null
}
