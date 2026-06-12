import type {
  DanmakuSourceType,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import type {
  PanelMediaInfo,
  PanelSubstate,
  PipelineEntry,
} from '@/common/rpcClient/background/types'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { episodeToPanelMedia } from './episodeToPanelMedia'

export interface PanelStateInputs {
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

/**
 * Derives the pipeline's panel entry, or null when the pipeline has nothing to
 * show. Manual mode only surfaces a successful mount, to avoid noise. Whether
 * the panel is enabled is a panel-wide gate applied in the player, not here.
 */
export function selectPanelState(
  inputs: PanelStateInputs
): PipelineEntry | null {
  const substate = deriveSubstate(inputs)
  if (inputs.isManual && substate !== 'mounted') {
    return null
  }
  return {
    source: 'pipeline',
    substate,
    media: resolveMedia(inputs),
    commentCount: inputs.isMounted ? inputs.commentCount : undefined,
    provider: inputs.provider,
  }
}
