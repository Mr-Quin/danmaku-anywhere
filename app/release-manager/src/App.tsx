import RefreshIcon from '@mui/icons-material/Refresh'
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from './api.js'
import { ActiveBuildCard } from './components/ActiveBuildCard.js'
import { ReleasesCard } from './components/ReleasesCard.js'
import { openFolder } from './shell.js'
import type { PublicState, ReleaseAsset, Row } from './types.js'
import type { Update } from './updater.js'
import { checkForUpdate, installUpdate, relaunchApp } from './updater.js'

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
      setHasMoreReleases(page1.length > 0)
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

  const { stable, previews } = useMemo(() => {
    const rows: Row[] = releases.map((r) => ({
      tag: r.tag,
      version: r.version,
      channel: r.channel,
      previewSubtype: r.previewSubtype,
      publishedAt: r.publishedAt,
    }))

    const seen = new Set(rows.map((r) => r.tag))
    const cachedRows: Row[] = state
      ? state.builds
          .filter((b) => !seen.has(b.tag))
          .map((b) => ({
            tag: b.tag,
            version: b.version,
            channel: b.channel,
          }))
      : []

    const all = [...rows, ...cachedRows]
    const byDate = (a: Row, b: Row) =>
      (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
    return {
      stable: all.filter((r) => r.channel === 'stable').sort(byDate),
      previews: all.filter((r) => r.channel === 'preview').sort(byDate),
    }
  }, [releases, state])

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
      setHasMoreReleases(more.length > 0)
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
      <AppBar>
        <Toolbar variant="dense" sx={{ minHeight: 44 }}>
          <Typography variant="h3" sx={{ flex: 1 }}>
            Release Manager
          </Typography>
          <Tooltip title="Check for updates">
            <span>
              <IconButton
                color="inherit"
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
                color="inherit"
                disabled={state === null || refreshing}
                onClick={() => {
                  void handleRefresh()
                }}
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Stack spacing={2} sx={{ maxWidth: 860, mx: 'auto' }}>
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
              <ActiveBuildCard
                state={state}
                onCopyPath={copyActivePath}
                onOpenPath={openActivePath}
              />
              <ReleasesCard
                stable={stable}
                previews={previews}
                state={state}
                busyTag={busyTag}
                rowErrors={rowErrors}
                onDownload={onDownload}
                onSetActive={onSetActive}
                onRemove={onRemove}
              />
              {hasMoreReleases ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    disabled={loadingMore}
                    onClick={() => {
                      void handleLoadMore()
                    }}
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </Button>
                </Box>
              ) : null}
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
