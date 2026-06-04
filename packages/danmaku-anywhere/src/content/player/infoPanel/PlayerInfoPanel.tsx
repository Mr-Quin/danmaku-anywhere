import { useDrag } from '@use-gesture/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { i18n } from '@/common/localization/i18n'
import type {
  PanelMediaInfo,
  PanelStateSnapshot,
  PanelSubstate,
} from '@/common/rpcClient/background/types'
import {
  clampOffset,
  type OffsetBounds,
} from '@/content/common/hooks/clampOffset'
import { usePersistedPosition } from '@/content/common/hooks/usePersistedPosition'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'
import { computePanelBounds } from './panelBounds'
import { usePanelStateStore } from './panelStateStore'
import { panelView } from './panelView'

const DEFAULT_OFFSET: DragOffset = { x: 16, y: 16 }

// Literal keys per substate so the i18n extractor can find them statically.
const HEADLINE: Record<PanelSubstate, () => string> = {
  loading: () => i18n.t('infoPanel.state.loading', 'Searching'),
  matched: () => i18n.t('infoPanel.state.matched', 'Matched'),
  mounted: () => i18n.t('infoPanel.state.mounted', 'Mounted'),
  noMatch: () => i18n.t('infoPanel.state.noMatch', 'No match'),
  error: () => i18n.t('infoPanel.state.error', 'Error'),
  disconnected: () => i18n.t('infoPanel.state.disconnected', 'Disconnected'),
}

function stateHeadline(state: PanelSubstate): string {
  return HEADLINE[state]()
}

function episodeLabel(media: PanelMediaInfo): string | null {
  if (media.episode === undefined) {
    return null
  }
  return typeof media.episode === 'number' ? `E${media.episode}` : media.episode
}

function MediaBlock({ media }: { media: PanelMediaInfo }) {
  const ep = episodeLabel(media)
  return (
    <div className="da-ip-media">
      <div className="da-ip-title">
        {media.title}
        {media.seasonDecorator ? (
          <span className="da-ip-season">{media.seasonDecorator}</span>
        ) : null}
      </div>
      {ep || media.episodeTitle ? (
        <div className="da-ip-epline">
          {ep ? <span className="da-ip-ep">{ep}</span> : null}
          {media.episodeTitle ? (
            <span className="da-ip-eptitle">{media.episodeTitle}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function CountRow({ count, provider }: { count: number; provider?: string }) {
  return (
    <div className="da-ip-count">
      <span className="da-ip-count-num">{count.toLocaleString()}</span>
      <span className="da-ip-count-label">
        {i18n.t('infoPanel.comments', 'comments')}
      </span>
      {provider ? <span className="da-ip-source">{provider}</span> : null}
    </div>
  )
}

function shouldRender(snapshot: PanelStateSnapshot | undefined): boolean {
  if (!snapshot || !snapshot.enabled) {
    return false
  }
  // Manual mode has no integration match; only surface a successful mount so
  // the panel indicates the manually-mounted danmaku rather than noise.
  if (snapshot.isManual && snapshot.state !== 'mounted') {
    return false
  }
  return true
}

export function PlayerInfoPanel() {
  const snapshot = usePanelStateStore((s) => s.snapshot)
  const active = usePanelStateStore((s) => s.active)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const { initialOffset, persistOffset } = usePersistedPosition(
    'infoPanelOffset',
    DEFAULT_OFFSET
  )
  const [offset, setOffset] = useState<DragOffset>(initialOffset)
  const offsetRef = useRef(offset)

  const applyOffset = useCallback((next: DragOffset) => {
    offsetRef.current = next
    setOffset(next)
  }, [])

  const currentBounds = useCallback((): OffsetBounds | undefined => {
    const el = panelRef.current
    const parent = el?.offsetParent as HTMLElement | null
    if (!el || !parent) {
      return undefined
    }
    return computePanelBounds(
      { width: parent.clientWidth, height: parent.clientHeight },
      { width: el.offsetWidth, height: el.offsetHeight }
    )
  }, [])

  const bind = useDrag(({ first, last, movement: [mx, my], memo }) => {
    const start = (memo as DragOffset | undefined) ?? offsetRef.current
    if (first) {
      setDragging(true)
    }
    const next = clampOffset(
      { x: start.x + mx, y: start.y + my },
      currentBounds()
    )
    applyOffset(next)
    if (last) {
      setDragging(false)
      persistOffset(next)
    }
    return start
  })

  useEffect(() => {
    const parent = panelRef.current?.offsetParent as HTMLElement | null
    if (!parent) {
      return
    }
    const observer = new ResizeObserver(() => {
      applyOffset(clampOffset(offsetRef.current, currentBounds()))
    })
    observer.observe(parent)
    return () => observer.disconnect()
  }, [applyOffset, currentBounds])

  if (!shouldRender(snapshot) || !snapshot) {
    return null
  }

  const view = panelView(snapshot.state)
  const expanded = hovered || dragging
  const visible = active || expanded
  const className = [
    'da-ip',
    expanded ? 'da-ip--expanded' : '',
    visible ? 'da-ip--visible' : '',
    dragging ? 'da-ip--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={panelRef}
      className={className}
      data-sev={view.severity}
      style={{ left: `${offset.x}px`, top: `${offset.y}px` }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="da-ip-header">
        <span
          className={view.pulse ? 'da-ip-dot da-ip-dot--pulse' : 'da-ip-dot'}
        />
        <span className="da-ip-headline">{stateHeadline(snapshot.state)}</span>
        {expanded ? (
          <span
            {...bind()}
            className="da-ip-grip"
            data-da-ip-grip
            aria-hidden="true"
          />
        ) : null}
      </div>

      {!expanded && view.showMedia && snapshot.media ? (
        <div className="da-ip-collapsed">
          {episodeLabel(snapshot.media) ? (
            <span className="da-ip-episode">
              {episodeLabel(snapshot.media)}
            </span>
          ) : null}
        </div>
      ) : null}

      {expanded ? (
        <div className="da-ip-body">
          {view.showMedia && snapshot.media ? (
            <MediaBlock media={snapshot.media} />
          ) : null}
          {view.showCount && snapshot.commentCount !== undefined ? (
            <CountRow
              count={snapshot.commentCount}
              provider={snapshot.provider}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
