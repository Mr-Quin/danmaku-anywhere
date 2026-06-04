import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import { isNotCustom } from '@/common/danmaku/utils'
import type { PanelMediaInfo } from '@/common/rpcClient/background/types'

/**
 * Maps a mounted episode to the panel's media shape, used in manual mode where
 * there is no integration match. A remote episode contributes its season title
 * (show), episode number, and episode title; a custom episode has only a title.
 */
export function episodeToPanelMedia(episode: GenericEpisode): PanelMediaInfo {
  if (isNotCustom(episode)) {
    return {
      title: episode.season.title,
      episode: episode.episodeNumber,
      episodeTitle: episode.title,
    }
  }
  return {
    title: episode.title,
  }
}
