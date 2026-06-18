import { useCallback, useEffect, useMemo, useState } from 'react'
import * as api from './api.js'
import { openFolder } from './shell.js'
import type {
  Channel,
  PreviewSubtype,
  PublicState,
  ReleaseAsset,
} from './types.js'
import type { Update } from './updater.js'
import { checkForUpdate, installUpdate, relaunchApp } from './updater.js'

interface Row {
  tag: string
  version: string
  channel: Channel
  previewSubtype?: PreviewSubtype
  publishedAt?: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

interface ReleaseRowProps {
  row: Row
  state: PublicState
  busy: boolean
  error?: string
  onDownload: (tag: string) => void
  onSetActive: (tag: string) => void
  onRemove: (tag: string) => void
}

function ReleaseRow(props: ReleaseRowProps) {
  const { row, state, busy, error } = props
  const cached = state.builds.some((b) => b.tag === row.tag)
  const isActive = state.activeTag === row.tag
  const disabled = busy

  function renderAction() {
    if (isActive) {
      return <span className="tag-active">Active</span>
    }
    if (cached) {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => props.onSetActive(row.tag)}
        >
          Set active
        </button>
      )
    }
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => props.onDownload(row.tag)}
      >
        Download
      </button>
    )
  }

  return (
    <tr>
      <td>
        <code>{row.tag}</code>
        {row.previewSubtype ? (
          <span className="subtype">{row.previewSubtype}</span>
        ) : null}
      </td>
      <td>{row.version}</td>
      <td>{row.publishedAt ? formatDate(row.publishedAt) : '-'}</td>
      <td>{cached ? <span className="cached">cached</span> : null}</td>
      <td className="actions">
        {renderAction()}
        {cached && !isActive ? (
          <button
            type="button"
            className="danger"
            disabled={disabled}
            onClick={() => props.onRemove(row.tag)}
          >
            Remove
          </button>
        ) : null}
        {busy ? <span className="working">Working...</span> : null}
        {error ? <div className="row-error">{error}</div> : null}
      </td>
    </tr>
  )
}

interface GroupProps {
  title: string
  rows: Row[]
  state: PublicState
  busyTag?: string
  rowErrors: Record<string, string>
  onDownload: (tag: string) => void
  onSetActive: (tag: string) => void
  onRemove: (tag: string) => void
}

function ReleaseGroup(props: GroupProps) {
  if (props.rows.length === 0) {
    return null
  }
  return (
    <section>
      <h2>{props.title}</h2>
      <table>
        <thead>
          <tr>
            <th>Tag</th>
            <th>Version</th>
            <th>Published</th>
            <th>Cached</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <ReleaseRow
              key={row.tag}
              row={row}
              state={props.state}
              busy={props.busyTag === row.tag}
              error={props.rowErrors[row.tag]}
              onDownload={props.onDownload}
              onSetActive={props.onSetActive}
              onRemove={props.onRemove}
            />
          ))}
        </tbody>
      </table>
    </section>
  )
}

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

  if (!state) {
    return <main className="container">Loading...</main>
  }

  return (
    <main className="container">
      <header>
        <h1>Extension Release Manager</h1>
        <div className="active-box">
          <div className="active-label">Active loaded folder</div>
          <div className="active-path">
            <code>{state.activePath ?? 'none selected'}</code>
            {state.activePath ? (
              <>
                <button type="button" onClick={copyActivePath}>
                  Copy
                </button>
                <button type="button" onClick={openActivePath}>
                  Open folder
                </button>
              </>
            ) : null}
          </div>
          <p className="hint">
            Load unpacked in chrome://extensions and select this folder, once.
          </p>
          {state.activeTag ? (
            <p className="hint">
              Active build: <code>{state.activeTag}</code>
            </p>
          ) : null}
        </div>
      </header>

      {globalError ? <div className="error">{globalError}</div> : null}

      {stable.length === 0 && previews.length === 0 ? (
        <p className="empty">No releases found</p>
      ) : null}

      <ReleaseGroup
        title="Stable"
        rows={stable}
        state={state}
        busyTag={busyTag}
        rowErrors={rowErrors}
        onDownload={onDownload}
        onSetActive={onSetActive}
        onRemove={onRemove}
      />
      <ReleaseGroup
        title="Previews"
        rows={previews}
        state={state}
        busyTag={busyTag}
        rowErrors={rowErrors}
        onDownload={onDownload}
        onSetActive={onSetActive}
        onRemove={onRemove}
      />

      {hasMoreReleases ? (
        <div className="load-more">
          <button
            type="button"
            onClick={() => {
              void handleLoadMore()
            }}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      ) : null}

      <section className="settings">
        <h2>Settings</h2>
        <label htmlFor="datadir">Data dir</label>
        <input id="datadir" type="text" value={state.dataDir} readOnly />
      </section>

      <section className="update-section">
        <h2>App Update</h2>
        <div className="update-controls">
          <button
            type="button"
            onClick={() => {
              void handleCheckUpdate()
            }}
            disabled={updateBusy}
          >
            Check for updates
          </button>
          {pendingUpdate ? (
            <div className="update-available">
              <span>Version {pendingUpdate.version} is available</span>
              <button
                type="button"
                onClick={() => {
                  void handleInstallUpdate()
                }}
                disabled={updateBusy}
              >
                Install and restart
              </button>
            </div>
          ) : null}
        </div>
        {updateError ? <div className="error">{updateError}</div> : null}
      </section>
    </main>
  )
}
