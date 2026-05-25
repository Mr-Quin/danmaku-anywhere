import type {
  PanelMediaInfo,
  PanelStateSnapshot,
  PanelSubstate,
} from '@/common/rpcClient/background/types'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

export interface PanelStateInputs {
  enabled: boolean
  isDisconnected: boolean
  isManual: boolean
  isMounted: boolean
  commentCount: number
  provider?: string
  integration: {
    active: boolean
    errorMessage?: string
    mediaInfo?: MediaInfo
  }
}

function deriveSubstate(inputs: PanelStateInputs): PanelSubstate {
  if (inputs.isDisconnected) {
    return 'disconnected'
  }
  if (inputs.integration.errorMessage) {
    return 'error'
  }
  if (inputs.isMounted) {
    return 'mounted'
  }
  if (inputs.integration.mediaInfo) {
    return 'matched'
  }
  if (inputs.integration.active) {
    return 'loading'
  }
  return 'noMatch'
}

function toPanelMedia(
  media: MediaInfo | undefined
): PanelMediaInfo | undefined {
  if (!media) {
    return undefined
  }
  return {
    title: media.title,
    seasonDecorator: media.seasonDecorator,
    episode: media.episode,
    episodeTitle: media.episodeTitle,
    originalTitle: media.originalTitle,
  }
}

export function selectPanelState(inputs: PanelStateInputs): PanelStateSnapshot {
  return {
    enabled: inputs.enabled,
    isManual: inputs.isManual,
    state: deriveSubstate(inputs),
    media: toPanelMedia(inputs.integration.mediaInfo),
    commentCount: inputs.isMounted ? inputs.commentCount : undefined,
    provider: inputs.provider,
  }
}
