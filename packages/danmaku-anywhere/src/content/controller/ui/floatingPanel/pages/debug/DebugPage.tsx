import { ContentCopy } from '@mui/icons-material'
import { Box, Divider, IconButton, Tab, Tabs, Tooltip } from '@mui/material'
import { produce } from 'immer'
import { useState } from 'react'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useStore } from '@/content/controller/store/store'

import { FramesPanel } from './components/FramesPanel'
import { OptionsPanel } from './components/OptionsPanel'
import { StatePanel } from './components/StatePanel'

enum DebugTab {
  Frames = 0,
  State = 1,
  Options = 2,
}

export const DebugPage = () => {
  const [tab, setTab] = useState<DebugTab>(DebugTab.Frames)
  const [copied, setCopied] = useState(false)
  const state = useStore()
  const { data: options } = useExtensionOptions()

  const handleCopyState = () => {
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
    void navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
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

      <Box display="flex" flexDirection="column" flexGrow={1} overflow="hidden">
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
        </Tabs>

        <Box flexGrow={1} overflow="hidden">
          {tab === DebugTab.Frames && <FramesPanel />}
          {tab === DebugTab.State && (
            <Box overflow="auto" p={1} height="100%">
              <StatePanel />
            </Box>
          )}
          {tab === DebugTab.Options && (
            <Box overflow="auto" height="100%">
              <OptionsPanel />
            </Box>
          )}
        </Box>
      </Box>
    </TabLayout>
  )
}
