import ClearIcon from '@mui/icons-material/Clear'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as api from './api.js'
import { ActiveBanner } from './components/ActiveBanner.js'
import { BrowseCard } from './components/BrowseCard.js'
import { InstalledCard } from './components/InstalledCard.js'
import { openFolder } from './shell.js'
import type { PublicState, ReleaseAsset, Row } from './types.js'
import type { Update } from './updater.js'
import { checkForUpdate, installUpdate, relaunchApp } from './updater.js'

const PAGE_SIZE = 100

export function App() {
  const [state, setState] = useState<PublicState | null>(null)
  const [releases, setReleases] = useState<ReleaseAsset[]>([])
  const [globalError, setGlobalError] = useState<string | undefined>()
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [busyTag, setBusyTag] = useState<string | undefined>()
  const [releasePage, setReleasePage] = useState(1)
  const [hasMoreReleases, setHasMoreReleases] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null)
  const [updateError, setUpdateError] = useState<string | undefined>()
  const [updateBusy, setUpdateBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const refreshState = useCallback(async () => {
    try {
      setState(await api.getState())
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  const loadReleases = useCallback(async () => {
    setGlobalError(undefined)
    try {
      const page1 = await api.getReleases(1)
      setReleases(page1)
      setReleasePage(1)
      setHasMoreReleases(page1.length === PAGE_SIZE)
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void refreshState()
    void loadReleases()
  }, [refreshState, loadReleases])

  // Check once on mount. The endpoint 404s until the update feed is published,
  // so errors are swallowed here. The manual button surfaces them.
  useEffect(() => {
    void checkForUpdate()
      .then((u) => {
        setPendingUpdate(u)
      })
      .catch((_err: unknown) => {
        return undefined
      })
  }, [])

  // The window is a webview, so the browser's Ctrl/Cmd+F find is unavailable.
  // Reuse the shortcut to focus the in-app search field instead.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const runRowAction = useCallback(
    async (tag: string, action: () => Promise<PublicState>) => {
      setBusyTag(tag)
      setRowErrors((prev) => {
        const next = { ...prev }
        delete next[tag]
        return next
      })
      try {
        setState(await action())
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setRowErrors((prev) => ({ ...prev, [tag]: message }))
      } finally {
        setBusyTag(undefined)
      }
    },
    []
  )

  const onDownload = useCallback(
    (tag: string) => {
      void runRowAction(tag, () => api.downloadBuild(tag))
    },
    [runRowAction]
  )
  const onSetActive = useCallback(
    (tag: string) => {
      void runRowAction(tag, () => api.setActive(tag))
    },
    [runRowAction]
  )
  const onRemove = useCallback(
    (tag: string) => {
      void runRowAction(tag, () => api.removeBuild(tag))
    },
    [runRowAction]
  )

  const installedBuilds = useMemo(() => {
    if (!state) {
      return []
    }
    return [...state.builds].sort((a, b) =>
      b.downloadedAt.localeCompare(a.downloadedAt)
    )
  }, [state])

  const { stable, previews } = useMemo(() => {
    const rows: Row[] = releases.map((r) => ({
      tag: r.tag,
      version: r.version,
      channel: r.channel,
      previewSubtype: r.previewSubtype,
      publishedAt: r.publishedAt,
    }))
    const byDate = (a: Row, b: Row) =>
      (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
    return {
      stable: rows.filter((r) => r.channel === 'stable').sort(byDate),
      previews: rows.filter((r) => r.channel === 'preview').sort(byDate),
    }
  }, [releases])

  async function handleCheckUpdate() {
    setUpdateBusy(true)
    setUpdateError(undefined)
    try {
      setPendingUpdate(await checkForUpdate())
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : String(error))
    } finally {
      setUpdateBusy(false)
    }
  }

  async function handleInstallUpdate() {
    if (!pendingUpdate) {
      return
    }
    setUpdateBusy(true)
    setUpdateError(undefined)
    try {
      await installUpdate(pendingUpdate)
      await relaunchApp()
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : String(error))
      setUpdateBusy(false)
    }
  }

  function copyActivePath() {
    if (state?.activePath) {
      void navigator.clipboard.writeText(state.activePath)
    }
  }

  function openActivePath() {
    if (state?.activePath) {
      void openFolder(state.activePath)
    }
  }

  async function handleLoadMore() {
    const nextPage = releasePage + 1
    setLoadingMore(true)
    setGlobalError(undefined)
    try {
      const more = await api.getReleases(nextPage)
      setReleases((prev) => {
        const seen = new Set(prev.map((r) => r.tag))
        const fresh = more.filter((r) => !seen.has(r.tag))
        return [...prev, ...fresh]
      })
      setReleasePage(nextPage)
      setHasMoreReleases(more.length === PAGE_SIZE)
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refreshState()
      await loadReleases()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.75,
          minHeight: 44,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <TextField
          inputRef={searchRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQuery('')
            }
          }}
          placeholder="Search releases"
          sx={{ flex: 1 }}
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
                      setQuery('')
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Tooltip title="Check for updates">
          <span>
            <IconButton
              disabled={updateBusy}
              onClick={() => {
                void handleCheckUpdate()
              }}
            >
              <Badge
                variant="dot"
                color="success"
                invisible={pendingUpdate === null}
              >
                <SystemUpdateAltIcon />
              </Badge>
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Reload">
          <span>
            <IconButton
              disabled={state === null || refreshing}
              onClick={() => {
                void handleRefresh()
              }}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto' }}>
          {state === null ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {globalError ? (
                <Alert
                  severity="error"
                  onClose={() => {
                    setGlobalError(undefined)
                  }}
                >
                  {globalError}
                </Alert>
              ) : null}
              {pendingUpdate ? (
                <Alert
                  severity="success"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      disabled={updateBusy}
                      onClick={() => {
                        void handleInstallUpdate()
                      }}
                    >
                      Install and restart
                    </Button>
                  }
                >
                  Version {pendingUpdate.version} is available
                </Alert>
              ) : null}
              {updateError ? (
                <Alert severity="error">{updateError}</Alert>
              ) : null}
              <ActiveBanner
                state={state}
                onCopyPath={copyActivePath}
                onOpenPath={openActivePath}
              />
              <InstalledCard
                builds={installedBuilds}
                activeTag={state.activeTag}
                busyTag={busyTag}
                query={query}
                rowErrors={rowErrors}
                onSetActive={onSetActive}
                onRemove={onRemove}
              />
              <BrowseCard
                stable={stable}
                previews={previews}
                state={state}
                busyTag={busyTag}
                query={query}
                rowErrors={rowErrors}
                hasMore={hasMoreReleases}
                loadingMore={loadingMore}
                onDownload={onDownload}
                onLoadMore={handleLoadMore}
              />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Data dir:{' '}
                  <Box component="span" sx={{ fontFamily: 'monospace' }}>
                    {state.dataDir}
                  </Box>
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
