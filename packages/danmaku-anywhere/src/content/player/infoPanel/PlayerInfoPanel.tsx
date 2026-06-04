import { useState } from 'react'
import { i18n } from '@/common/localization/i18n'
import type {
  PanelMediaInfo,
  PanelStateSnapshot,
  PanelSubstate,
} from '@/common/rpcClient/background/types'
import { usePanelStateStore } from './panelStateStore'
import { panelView } from './panelView'

const HEADLINE: Record<PanelSubstate, [key: string, fallback: string]> = {
  loading: ['infoPanel.state.loading', 'Searching'],
  matched: ['infoPanel.state.matched', 'Matched'],
  mounted: ['infoPanel.state.mounted', 'Mounted'],
  noMatch: ['infoPanel.state.noMatch', 'No match'],
  error: ['infoPanel.state.error', 'Error'],
  disconnected: ['infoPanel.state.disconnected', 'Disconnected'],
}

function stateHeadline(state: PanelSubstate): string {
  const [key, fallback] = HEADLINE[state]
  return i18n.t(key, fallback)
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
  const [expanded, setExpanded] = useState(false)

  if (!shouldRender(snapshot) || !snapshot) {
    return null
  }

  const view = panelView(snapshot.state)
  const visible = active || expanded
  const className = [
    'da-ip',
    expanded ? 'da-ip--expanded' : '',
    visible ? 'da-ip--visible' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      data-sev={view.severity}
      onPointerEnter={() => setExpanded(true)}
      onPointerLeave={() => setExpanded(false)}
    >
      <div className="da-ip-header">
        <span
          className={view.pulse ? 'da-ip-dot da-ip-dot--pulse' : 'da-ip-dot'}
        />
        <span className="da-ip-headline">{stateHeadline(snapshot.state)}</span>
        {expanded ? (
          <span className="da-ip-grip" data-da-ip-grip aria-hidden="true" />
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
