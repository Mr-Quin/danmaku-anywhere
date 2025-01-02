import { Box, useTheme } from '@mui/material'
import { useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useLocation } from 'react-router-dom'

import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const IntegrationPolicyEditor = () => {
  const theme = useTheme()
  const config: Integration = useLocation().state
  const preRef = useRef<HTMLPreElement>(null)

  const selectAll = () => {
    if (preRef.current) {
      const range = document.createRange()
      range.selectNodeContents(preRef.current)
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  useHotkeys('ctrl+a', selectAll, { preventDefault: true })

  return (
    <OptionsPageLayout direction="left">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <OptionsPageToolBar sticky title={config.name} />
        <Box p={2} overflow="auto">
          <pre
            ref={preRef}
            style={{
              fontSize: theme.typography.body2.fontSize,
              margin: 0,
            }}
          >
            {JSON.stringify(config, null, 2)}
          </pre>
        </Box>
      </div>
    </OptionsPageLayout>
  )
}
