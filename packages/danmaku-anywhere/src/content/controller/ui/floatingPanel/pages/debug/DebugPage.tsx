import { ContentCopy } from '@mui/icons-material'
import { Box, Divider, IconButton, Tab, Tabs, Tooltip } from '@mui/material'
import { produce } from 'immer'
import { useCallback, useEffect, useState } from 'react'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { playerRpcClient } from '@/common/rpcClient/background/client'
import type { SegmentationStats } from '@/common/rpcClient/background/types'
import { useStore } from '@/content/controller/store/store'

import { FramesPanel } from './components/FramesPanel'
import { OptionsPanel } from './components/OptionsPanel'
import { SegmentationPanel } from './components/SegmentationPanel'
import { StatePanel } from './components/StatePanel'

enum DebugTab {
  Frames = 0,
  State = 1,
  Options = 2,
  Segmentation = 3,
}

const SEGMENTATION_POLL_MS = 1000

const idleSegmentationStats: SegmentationStats = {
  running: false,
  model: null,
  fps: null,
  lastError: null,
  debugOverlay: false,
}

export const DebugPage = () => {
  const [tab, setTab] = useState<DebugTab>(DebugTab.Frames)
  const [copied, setCopied] = useState(false)
  const [segmentationStats, setSegmentationStats] = useState<SegmentationStats>(
    idleSegmentationStats
  )
  const state = useStore()
  const { data: options } = useExtensionOptions()
  const activeFrameId = useStore.use.frame().activeFrame?.frameId

  const segmentationTabActive = tab === DebugTab.Segmentation

  useEffect(() => {
    if (!segmentationTabActive || activeFrameId === undefined) {
      setSegmentationStats(idleSegmentationStats)
      return
    }
    let cancelled = false
    const poll = async () => {
      const res = await playerRpcClient.player[
        'relay:command:getSegmentationStats'
      ]({ frameId: activeFrameId })
      if (!cancelled) {
        setSegmentationStats(res.data)
      }
    }
    void poll()
    const id = window.setInterval(() => {
      void poll()
    }, SEGMENTATION_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [segmentationTabActive, activeFrameId])

  const handleToggleDebugOverlay = useCallback(
    (enabled: boolean) => {
      if (activeFrameId === undefined) {
        return
      }
      setSegmentationStats((prev) => ({ ...prev, debugOverlay: enabled }))
      void playerRpcClient.player['relay:command:setOcclusionDebugOverlay']({
        frameId: activeFrameId,
        data: enabled,
      })
    },
    [activeFrameId]
  )

  const handleCopyState = async () => {
    // biome-ignore lint/suspicious/noExplicitAny: debug page serialization
    const snapshot = produce(state, (draft: any) => {
      delete draft.danmaku.comments
      if (draft.danmaku.episodes) {
        for (const item of draft.danmaku.episodes) {
          if ('comments' in item) {
            delete item.comments
          }
        }
      }
      draft.frame.allFrames = Object.fromEntries(
        draft.frame.allFrames.entries()
      )
      draft.options = options
    })
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error('Failed to copy debug state to clipboard', e)
    }
  }

  return (
    <TabLayout>
      <TabToolbar title="Debug">
        <Tooltip title={copied ? 'Copied!' : 'Copy state'}>
          <IconButton size="small" onClick={handleCopyState}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </TabToolbar>
      <Divider />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              fontSize: 12,
              textTransform: 'none',
              py: 0,
            },
          }}
        >
          <Tab label="Frames" />
          <Tab label="State" />
          <Tab label="Options" />
          <Tab label="Segmentation" />
        </Tabs>

        <Box
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
          }}
        >
          {tab === DebugTab.Frames && <FramesPanel />}
          {tab === DebugTab.State && (
            <Box
              sx={{
                overflow: 'auto',
                p: 1,
                height: '100%',
              }}
            >
              <StatePanel />
            </Box>
          )}
          {tab === DebugTab.Options && (
            <Box
              sx={{
                overflow: 'auto',
                height: '100%',
              }}
            >
              <OptionsPanel />
            </Box>
          )}
          {tab === DebugTab.Segmentation && (
            <Box
              sx={{
                overflow: 'auto',
                height: '100%',
              }}
            >
              <SegmentationPanel
                {...segmentationStats}
                onToggleDebugOverlay={handleToggleDebugOverlay}
              />
            </Box>
          )}
        </Box>
      </Box>
    </TabLayout>
  )
}
