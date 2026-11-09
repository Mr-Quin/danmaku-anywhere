import CheckIcon from '@mui/icons-material/Check'
import ClearIcon from '@mui/icons-material/Clear'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListSubheader from '@mui/material/ListSubheader'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { Ref } from 'react'
import type { Build, BuildKind } from '../builds.js'
import { KIND_LABEL, matchesQuery } from '../builds.js'
import { formatDay } from '../format.js'
import type { BusyAction } from './BuildDetail.js'
import { BUSY_LABEL } from './BuildDetail.js'

const ACTION_WIDTH = 124

export type KindFilter = 'all' | Extract<BuildKind, 'stable' | 'nightly' | 'pr'>

interface BuildListProps {
  builds: Build[]
  selectedTag?: string
  busy?: { tag: string; action: BusyAction }
  locked: boolean
  query: string
  filter: KindFilter
  searchRef: Ref<HTMLInputElement>
  hasMore: boolean
  loadingMore: boolean
  refreshing: boolean
  onQueryChange: (query: string) => void
  onFilterChange: (filter: KindFilter) => void
  onSelect: (tag: string) => void
  onUse: (tag: string) => void
  onLoadMore: () => void
  onRefresh: () => void
}

export function BuildList({
  builds,
  selectedTag,
  busy,
  locked,
  query,
  filter,
  searchRef,
  hasMore,
  loadingMore,
  refreshing,
  onQueryChange,
  onFilterChange,
  onSelect,
  onUse,
  onLoadMore,
  onRefresh,
}: BuildListProps) {
  const shown = builds.filter((b) => {
    if (filter !== 'all' && b.kind !== filter) {
      return false
    }
    return matchesQuery(b, query)
  })
  const groups: [string, Build[]][] = [
    ['Downloaded', shown.filter((b) => b.installed)],
    ['Available', shown.filter((b) => !b.installed)],
  ]

  return (
    <Box
      sx={{
        width: 340,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            inputRef={searchRef}
            fullWidth
            size="small"
            value={query}
            placeholder="Search builds"
            onChange={(e) => {
              onQueryChange(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onQueryChange('')
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Clear search"
                      onClick={() => {
                        onQueryChange('')
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <Tooltip title="Reload releases">
            <span>
              <IconButton
                aria-label="Reload releases"
                disabled={refreshing}
                onClick={onRefresh}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          fullWidth
          value={filter}
          onChange={(_e, value: KindFilter | null) => {
            if (value) {
              onFilterChange(value)
            }
          }}
          sx={{ mt: 1.5 }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="stable">Stable</ToggleButton>
          <ToggleButton value="nightly">Nightly</ToggleButton>
          <ToggleButton value="pr">PRs</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <List disablePadding sx={{ flex: 1, overflow: 'auto', px: 1, pb: 2 }}>
        {groups.map(([name, items]) => {
          if (items.length === 0) {
            return null
          }
          return (
            <li key={name}>
              <ul style={{ padding: 0 }}>
                <ListSubheader
                  sx={{
                    bgcolor: 'background.default',
                    color: 'text.secondary',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    lineHeight: '32px',
                    px: 1,
                  }}
                >
                  {name} · {items.length}
                </ListSubheader>
                {items.map((build) => (
                  <BuildListItem
                    key={build.tag}
                    build={build}
                    selected={build.tag === selectedTag}
                    busyAction={
                      busy?.tag === build.tag ? busy.action : undefined
                    }
                    locked={locked}
                    onSelect={onSelect}
                    onUse={onUse}
                  />
                ))}
              </ul>
            </li>
          )
        })}
        {shown.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: 'center' }}
          >
            No builds match.
          </Typography>
        ) : null}
        {hasMore ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
            <Button size="small" loading={loadingMore} onClick={onLoadMore}>
              Load older releases
            </Button>
          </Box>
        ) : null}
      </List>
    </Box>
  )
}

interface BuildListItemProps {
  build: Build
  selected: boolean
  busyAction?: BusyAction
  locked: boolean
  onSelect: (tag: string) => void
  onUse: (tag: string) => void
}

function BuildListItem({
  build,
  selected,
  busyAction,
  locked,
  onSelect,
  onUse,
}: BuildListItemProps) {
  const date = build.publishedAt ?? build.downloadedAt

  let action = null
  if (busyAction) {
    action = (
      <Typography
        variant="caption"
        color="primary"
        sx={{
          width: ACTION_WIDTH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
        }}
      >
        <CircularProgress size={12} />
        {BUSY_LABEL[busyAction]}
      </Typography>
    )
  } else if (build.active) {
    action = (
      <Typography
        variant="caption"
        color="success.main"
        sx={{
          width: ACTION_WIDTH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          fontWeight: 600,
        }}
      >
        <CheckIcon fontSize="inherit" />
        In use
      </Typography>
    )
  } else {
    action = (
      <Button
        size="small"
        variant={build.installed ? 'text' : 'outlined'}
        startIcon={build.installed ? undefined : <DownloadIcon />}
        disabled={locked}
        sx={{ width: ACTION_WIDTH, whiteSpace: 'nowrap' }}
        onClick={() => {
          onSelect(build.tag)
          onUse(build.tag)
        }}
      >
        {build.installed ? 'Use' : 'Get and use'}
      </Button>
    )
  }

  return (
    <ListItem
      disablePadding
      secondaryAction={action}
      sx={{ '& .MuiListItemSecondaryAction-root': { right: 8 } }}
    >
      <ListItemButton
        selected={selected}
        onClick={() => {
          onSelect(build.tag)
        }}
        sx={{ borderRadius: 1, py: 0.75, pr: 17 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {build.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: 'block' }}
          >
            {KIND_LABEL[build.kind]}
            {date ? ` · ${formatDay(date)}` : ''}
          </Typography>
        </Box>
      </ListItemButton>
    </ListItem>
  )
}
