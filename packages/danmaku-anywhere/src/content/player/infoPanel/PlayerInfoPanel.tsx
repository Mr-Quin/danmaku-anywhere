import { useDrag } from '@use-gesture/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { i18n } from '@/common/localization/i18n'
import type {
  PanelMediaInfo,
  PipelineEntry,
} from '@/common/rpcClient/background/types'
import {
  clampOffset,
  type OffsetBounds,
} from '@/content/common/hooks/clampOffset'
import { usePersistedPosition } from '@/content/common/hooks/usePersistedPosition'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'
import { entryView } from './entryView'
import { computePanelBounds } from './panelBounds'
import type { OcclusionEntry, PanelEntry } from './panelEntry'
import { usePanelStateStore } from './panelStateStore'
import { panelView } from './panelView'
import { resolvePanelEntries } from './resolvePanelEntries'

const DEFAULT_OFFSET: DragOffset = { x: 16, y: 16 }

type DragBind = ReturnType<typeof useDrag>

function episodeLabel(media: PanelMediaInfo): string | null {
  if (media.episode === undefined) {
    return null
  }
  if (typeof media.episode === 'number') {
    return i18n.t('anime.numericEpisode', 'Episode {{episode}}', {
      episode: media.episode,
    })
  }
  return media.episode
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

function PipelineBody({ entry }: { entry: PipelineEntry }) {
  const view = panelView(entry.substate)
  return (
    <div className="da-ip-body">
      {view.showMedia && entry.media ? (
        <MediaBlock media={entry.media} />
      ) : null}
      {view.showCount && entry.commentCount !== undefined ? (
        <div className="da-ip-count">
          <span data-da-ip-count className="da-ip-count-num">
            {entry.commentCount.toLocaleString()}
          </span>
          <span className="da-ip-count-label">
            {i18n.t('infoPanel.comments', 'comments')}
          </span>
          {entry.provider ? (
            <span data-da-ip-source className="da-ip-source">
              {localizedDanmakuSourceType(entry.provider)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function OcclusionBody({ entry }: { entry: OcclusionEntry }) {
  if (!entry.message) {
    return null
  }
  return (
    <div className="da-ip-body">
      <p data-da-ip-message className="da-ip-message">
        {entry.message}
      </p>
    </div>
  )
}

function RowHeadline({ entry }: { entry: PanelEntry }) {
  return (
    <span data-da-ip-headline className="da-ip-headline">
      {entryView(entry).headline()}
    </span>
  )
}

// Collapsed, a pipeline row with media glances the title and episode (more
// useful than the status word, which the dot already conveys); everything else
// falls back to the status headline.
function CollapsedGlance({ entry }: { entry: PanelEntry }) {
  if (entry.source !== 'pipeline' || !entry.media) {
    return <RowHeadline entry={entry} />
  }
  const ep = episodeLabel(entry.media)
  return (
    <>
      <span className="da-ip-glance-title">{entry.media.title}</span>
      {ep ? (
        <span data-da-ip-tag className="da-ip-tag">
          {ep}
        </span>
      ) : null}
    </>
  )
}

function RowBody({ entry }: { entry: PanelEntry }) {
  if (entry.source === 'pipeline') {
    return <PipelineBody entry={entry} />
  }
  return <OcclusionBody entry={entry} />
}

function PanelRow({
  entry,
  expanded,
  dragBind,
}: {
  entry: PanelEntry
  expanded: boolean
  dragBind: DragBind
}) {
  const view = entryView(entry)
  return (
    <div
      data-da-ip-row
      data-source={entry.source}
      data-sev={view.severity}
      className="da-ip-row"
    >
      {/* The header row is the drag handle. */}
      <div className="da-ip-row-header" {...dragBind()}>
        <span
          className={view.pulse ? 'da-ip-dot da-ip-dot--pulse' : 'da-ip-dot'}
        />
        {expanded ? (
          <RowHeadline entry={entry} />
        ) : (
          <CollapsedGlance entry={entry} />
        )}
      </div>
      {expanded ? <RowBody entry={entry} /> : null}
    </div>
  )
}

export function PlayerInfoPanel() {
  const entries = resolvePanelEntries(usePanelStateStore.use.entries())
  const enabled = usePanelStateStore.use.enabled()
  const active = usePanelStateStore.use.active()
  const pipActive = usePanelStateStore.use.pipActive()
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dismissed, setDismissed] = useState(false)

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

  const rendered = enabled && !pipActive && entries.length > 0

  // Re-runs once the panel actually renders, then keeps the offset clamped: the
  // parent observer covers video resizes, the panel observer covers the panel
  // growing or shrinking as rows appear and disappear.
  useEffect(() => {
    const el = panelRef.current
    const parent = el?.offsetParent as HTMLElement | null
    if (!rendered || !el || !parent) {
      return
    }
    applyOffset(clampOffset(offsetRef.current, currentBounds()))
    const observer = new ResizeObserver(() => {
      applyOffset(clampOffset(offsetRef.current, currentBounds()))
    })
    observer.observe(parent)
    observer.observe(el)
    return () => observer.disconnect()
  }, [rendered, dismissed, applyOffset, currentBounds])

  if (!rendered) {
    return null
  }

  if (dismissed) {
    return (
      <button
        type="button"
        className="da-ip-restore"
        style={{ left: `${offset.x}px`, top: `${offset.y}px` }}
        onClick={() => setDismissed(false)}
        aria-label={i18n.t('infoPanel.show', 'Show info panel')}
      />
    )
  }

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
      style={{ left: `${offset.x}px`, top: `${offset.y}px` }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="da-ip-rows">
        {entries.map((entry) => (
          <PanelRow
            key={entry.source}
            entry={entry}
            expanded={expanded}
            dragBind={bind}
          />
        ))}
      </div>
      {expanded ? (
        <button
          type="button"
          className="da-ip-collapse"
          onClick={() => setDismissed(true)}
          aria-label={i18n.t('infoPanel.hide', 'Hide info panel')}
        />
      ) : null}
    </div>
  )
}
