import type {
  DanmakuSourceType,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import type {
  PanelMediaInfo,
  PanelStateSnapshot,
  PanelSubstate,
} from '@/common/rpcClient/background/types'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { episodeToPanelMedia } from './episodeToPanelMedia'

export interface PanelStateInputs {
  enabled: boolean
  isDisconnected: boolean
  isManual: boolean
  isMounted: boolean
  commentCount: number
  provider?: DanmakuSourceType
  mountedEpisodes?: GenericEpisode[]
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

function resolveMedia(inputs: PanelStateInputs): PanelMediaInfo | undefined {
  if (inputs.integration.mediaInfo) {
    return inputs.integration.mediaInfo.toJSON()
  }
  // Manual mode has no integration match; derive media from the mounted episode.
  const episode = inputs.mountedEpisodes?.[0]
  if (episode) {
    return episodeToPanelMedia(episode)
  }
  return undefined
}

export function selectPanelState(inputs: PanelStateInputs): PanelStateSnapshot {
  return {
    enabled: inputs.enabled,
    isManual: inputs.isManual,
    state: deriveSubstate(inputs),
    media: resolveMedia(inputs),
    commentCount: inputs.isMounted ? inputs.commentCount : undefined,
    provider: inputs.provider,
  }
}
