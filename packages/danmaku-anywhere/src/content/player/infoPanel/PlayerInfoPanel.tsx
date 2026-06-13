import { useDrag } from '@use-gesture/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { localizedDanmakuSourceType } from '@/common/danmaku/enums'
import { i18n } from '@/common/localization/i18n'
import type {
  PanelMediaInfo,
  PipelineEntry,
} from '@/common/rpcClient/background/types'
import { clampOffset } from '@/content/common/hooks/clampOffset'
import { usePersistedPosition } from '@/content/common/hooks/usePersistedPosition'
import type { DragOffset } from '@/content/controller/ui/components/dragOffset'
import { entryView } from './entryView'
import {
  computePanelBounds,
  fractionToOffset,
  offsetToFraction,
  type Size,
} from './panelBounds'
import type { OcclusionEntry, PanelEntry, PanelSource } from './panelEntry'
import { usePanelStateStore } from './panelStateStore'
import { panelView } from './panelView'

// Fixed display order, one row per source; a new source slots in here.
const SOURCE_ORDER: readonly PanelSource[] = ['pipeline', 'occlusion']

const DEFAULT_FRACTION: DragOffset = { x: 0.1, y: 0.06 }

// First paint before the panel is measured; the fraction takes over on mount.
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
  const stored = usePanelStateStore.use.entries()
  const entries = SOURCE_ORDER.map((source) => stored[source]).filter(
    (entry): entry is PanelEntry => entry !== undefined
  )
  const enabled = usePanelStateStore.use.enabled()
  const active = usePanelStateStore.use.active()
  const pipActive = usePanelStateStore.use.pipActive()
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [placed, setPlaced] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const { initialOffset: initialFraction, persistOffset: persistFraction } =
    usePersistedPosition('infoPanelPosition', DEFAULT_FRACTION)
  const fractionRef = useRef<DragOffset>(initialFraction)
  const [offset, setOffset] = useState<DragOffset>(DEFAULT_OFFSET)
  const offsetRef = useRef(offset)

  const applyOffset = useCallback((next: DragOffset) => {
    if (offsetRef.current.x === next.x && offsetRef.current.y === next.y) {
      return
    }
    offsetRef.current = next
    setOffset(next)
  }, [])

  const measure = useCallback((): { parent: Size; panel: Size } | null => {
    const el = panelRef.current
    const parent = el?.offsetParent as HTMLElement | null
    if (!el || !parent) {
      return null
    }
    return {
      parent: { width: parent.clientWidth, height: parent.clientHeight },
      panel: { width: el.offsetWidth, height: el.offsetHeight },
    }
  }, [])

  const placeFromFraction = useCallback(
    (fraction: DragOffset) => {
      fractionRef.current = fraction
      const m = measure()
      // While the player is collapsed to zero size the bounds are meaningless;
      // keep the last offset so the position is not lost during the transition.
      if (!m || m.parent.width === 0 || m.parent.height === 0) {
        return
      }
      applyOffset(fractionToOffset(fraction, m.parent, m.panel))
      setPlaced(true)
    },
    [measure, applyOffset]
  )

  const clampCurrent = useCallback(() => {
    const m = measure()
    if (m) {
      applyOffset(
        clampOffset(offsetRef.current, computePanelBounds(m.parent, m.panel))
      )
    }
  }, [measure, applyOffset])

  const moveTo = useCallback(
    (next: DragOffset, persist: boolean) => {
      const m = measure()
      const clamped = m
        ? clampOffset(next, computePanelBounds(m.parent, m.panel))
        : next
      applyOffset(clamped)
      if (m) {
        fractionRef.current = offsetToFraction(clamped, m.parent, m.panel)
        if (persist) {
          persistFraction(fractionRef.current)
        }
      }
    },
    [measure, applyOffset, persistFraction]
  )

  const bind = useDrag(({ first, last, movement: [mx, my], memo }) => {
    const start = (memo as DragOffset | undefined) ?? offsetRef.current
    if (first) {
      setDragging(true)
    }
    moveTo({ x: start.x + mx, y: start.y + my }, last)
    if (last) {
      setDragging(false)
    }
    return start
  })

  const tabBind = useDrag(
    ({ tap, last, movement: [, my], memo }) => {
      if (tap) {
        setDismissed(false)
        return
      }
      const startY = (memo as number | undefined) ?? offsetRef.current.y
      moveTo({ x: offsetRef.current.x, y: startY + my }, last)
      return startY
    },
    { filterTaps: true }
  )

  const rendered = enabled && !pipActive && entries.length > 0

  // A container resize (e.g. fullscreen) re-places the panel from its stored
  // fraction so it keeps its proportional spot. The panel's own size changes
  // (expanding on hover) only re-clamp, so it grows from a fixed top-left rather
  // than recentering and sliding out from under the pointer.
  useEffect(() => {
    const el = panelRef.current
    const parent = el?.offsetParent as HTMLElement | null
    if (!rendered || !el || !parent) {
      return
    }
    placeFromFraction(fractionRef.current)
    const containerObserver = new ResizeObserver(() =>
      placeFromFraction(fractionRef.current)
    )
    containerObserver.observe(parent)
    const panelObserver = new ResizeObserver(() => clampCurrent())
    panelObserver.observe(el)
    return () => {
      containerObserver.disconnect()
      panelObserver.disconnect()
    }
  }, [rendered, dismissed, placeFromFraction, clampCurrent])

  if (!rendered) {
    return null
  }

  // Not gated on `dismissed`: the panel keeps its current form while it slides
  // off, so the rows do not swap content mid-transition and flash.
  const expanded = hovered || dragging
  const visible = placed && !dismissed && (active || expanded)
  const className = [
    'da-ip',
    dismissed ? 'da-ip--docked' : '',
    expanded ? 'da-ip--expanded' : '',
    visible ? 'da-ip--visible' : '',
    dragging ? 'da-ip--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {/* Kept mounted while docked so it slides off rather than vanishing. */}
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
      {dismissed ? (
        <button
          type="button"
          className="da-ip-tab"
          style={{ top: `${offset.y}px` }}
          aria-label={i18n.t('infoPanel.show', 'Show info panel')}
          onClick={() => setDismissed(false)}
          {...tabBind()}
        />
      ) : null}
    </>
  )
}
