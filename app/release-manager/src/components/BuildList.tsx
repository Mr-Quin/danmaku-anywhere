import ClearIcon from '@mui/icons-material/Clear'
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
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

export type KindFilter = 'all' | Extract<BuildKind, 'stable' | 'nightly' | 'pr'>

interface BuildListProps {
  builds: Build[]
  selectedTag?: string
  busyTags: Set<string>
  query: string
  filter: KindFilter
  searchRef: Ref<HTMLInputElement>
  hasMore: boolean
  loadingMore: boolean
  refreshing: boolean
  onQueryChange: (query: string) => void
  onFilterChange: (filter: KindFilter) => void
  onSelect: (tag: string) => void
  onLoadMore: () => void
  onRefresh: () => void
}

export function BuildList({
  builds,
  selectedTag,
  busyTags,
  query,
  filter,
  searchRef,
  hasMore,
  loadingMore,
  refreshing,
  onQueryChange,
  onFilterChange,
  onSelect,
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
        width: 320,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ p: 1.5, pb: 1 }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter}
            onChange={(_e, value: KindFilter | null) => {
              if (value) {
                onFilterChange(value)
              }
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="stable">Stable</ToggleButton>
            <ToggleButton value="nightly">Nightly</ToggleButton>
            <ToggleButton value="pr">PRs</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Reload releases">
            <span>
              <IconButton
                size="small"
                aria-label="Reload releases"
                disabled={refreshing}
                onClick={onRefresh}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      <List dense disablePadding sx={{ flex: 1, overflow: 'auto' }}>
        {groups.map(([name, items]) => {
          if (items.length === 0) {
            return null
          }
          return (
            <li key={name}>
              <ul style={{ padding: 0 }}>
                <ListSubheader sx={{ lineHeight: '32px' }}>
                  {name}
                </ListSubheader>
                {items.map((build) => (
                  <BuildListItem
                    key={build.tag}
                    build={build}
                    selected={build.tag === selectedTag}
                    busy={busyTags.has(build.tag)}
                    onSelect={onSelect}
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
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
  busy: boolean
  onSelect: (tag: string) => void
}

function BuildListItem({
  build,
  selected,
  busy,
  onSelect,
}: BuildListItemProps) {
  const date = build.publishedAt ?? build.downloadedAt

  let status = null
  if (busy) {
    status = <CircularProgress size={14} />
  } else if (build.active) {
    status = (
      <Typography variant="caption" color="success.main">
        In use
      </Typography>
    )
  } else if (!build.installed) {
    status = <CloudDownloadOutlinedIcon fontSize="small" color="disabled" />
  }

  return (
    <ListItemButton
      selected={selected}
      onClick={() => {
        onSelect(build.tag)
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
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
      {status}
    </ListItemButton>
  )
}
