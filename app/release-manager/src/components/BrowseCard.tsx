import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { matchesQuery } from '../search.js'
import type { PublicState, Row } from '../types.js'
import { BrowseRow } from './BrowseRow.js'

type TabValue = 'stable' | 'preview'

interface BrowseCardProps {
  stable: Row[]
  previews: Row[]
  state: PublicState
  busyTag?: string
  query: string
  rowErrors: Record<string, string>
  hasMore: boolean
  loadingMore: boolean
  onDownload: (tag: string) => void
  onLoadMore: () => void
}

export function BrowseCard({
  stable,
  previews,
  state,
  busyTag,
  query,
  rowErrors,
  hasMore,
  loadingMore,
  onDownload,
  onLoadMore,
}: BrowseCardProps) {
  const [tab, setTab] = useState<TabValue>('stable')
  const all = tab === 'stable' ? stable : previews
  const rows = all.filter((r) => matchesQuery(query, r.tag, r.version))
  const filtering = query.trim().length > 0
  const installed = new Set(state.builds.map((b) => b.tag))

  function handleTabChange(_e: React.SyntheticEvent, value: TabValue) {
    setTab(value)
  }

  return (
    <Card>
      <Box sx={{ px: 2, pt: 1.5 }}>
        <Typography variant="overline">Browse releases</Typography>
      </Box>
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
            {filtering
              ? 'No matches in loaded releases. Try Load more.'
              : 'No releases found'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          {rows.map((row) => (
            <BrowseRow
              key={row.tag}
              row={row}
              installed={installed.has(row.tag)}
              active={state.activeTag === row.tag}
              busy={busyTag === row.tag}
              error={rowErrors[row.tag]}
              onDownload={onDownload}
            />
          ))}
        </Box>
      )}
      {hasMore ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
          <Button
            variant="outlined"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </Box>
      ) : null}
    </Card>
  )
}
