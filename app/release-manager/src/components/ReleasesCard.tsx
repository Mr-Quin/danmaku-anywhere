import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import type { PublicState, Row } from '../types.js'
import { ReleaseRow } from './ReleaseRow.js'

type TabValue = 'stable' | 'preview'

interface ReleasesCardProps {
  stable: Row[]
  previews: Row[]
  state: PublicState
  busyTag?: string
  rowErrors: Record<string, string>
  onDownload: (tag: string) => void
  onSetActive: (tag: string) => void
  onRemove: (tag: string) => void
}

export function ReleasesCard({
  stable,
  previews,
  state,
  busyTag,
  rowErrors,
  onDownload,
  onSetActive,
  onRemove,
}: ReleasesCardProps) {
  const [tab, setTab] = useState<TabValue>('stable')
  const rows = tab === 'stable' ? stable : previews

  function handleTabChange(_e: React.SyntheticEvent, value: TabValue) {
    setTab(value)
  }

  return (
    <Card>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
      >
        <Tab label="Stable" value="stable" />
        <Tab label="Previews" value="preview" />
      </Tabs>
      {rows.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No releases found
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          {rows.map((row) => (
            <ReleaseRow
              key={row.tag}
              row={row}
              state={state}
              busy={busyTag === row.tag}
              error={rowErrors[row.tag]}
              onDownload={onDownload}
              onSetActive={onSetActive}
              onRemove={onRemove}
            />
          ))}
        </Box>
      )}
    </Card>
  )
}
