import type {
  PanelMediaInfo,
  PipelineEntry,
} from '@/common/rpcClient/background/types'

function panelMediaEqual(
  a: PanelMediaInfo | undefined,
  b: PanelMediaInfo | undefined
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.title === b.title &&
    a.episode === b.episode &&
    a.episodeTitle === b.episodeTitle &&
    a.seasonDecorator === b.seasonDecorator &&
    a.originalTitle === b.originalTitle
  )
}

export function panelEntriesEqual(a: PipelineEntry, b: PipelineEntry): boolean {
  return (
    a.substate === b.substate &&
    a.commentCount === b.commentCount &&
    a.provider === b.provider &&
    panelMediaEqual(a.media, b.media)
  )
}
