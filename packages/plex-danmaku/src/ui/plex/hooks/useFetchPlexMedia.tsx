import { DanDanAnime } from '@danmaku-anywhere/danmaku-engine'
import { useEffect, useRef } from 'preact/hooks'

import {
  matchAnimeEpisode,
  matchAnimeTitle,
  mediaChangeType,
  PlexMediaInfo,
} from '../plexMediaUtils'

import { useMedia, useStore } from '@/store/store'
import { logger } from '@/utils/logger'

export const useFetchMedia = (mediaInfo: PlexMediaInfo | null) => {
  const { meta } = useMedia()
  const resetMedia = useStore.use.resetMedia()
  const fetchMediaInfo = useStore.use.fetchMediaInfo()
  const getTitleMap = useStore.use.getTitleMap()
  const updateMedia = useStore.use.updateMedia()
  const fetchComments = useStore.use.fetchComments()

  const prevMediaInfo = useRef(mediaInfo)

  // when title changes, send a request to search for the anime
  useEffect(() => {
    if (!mediaInfo) return

    const { episode, title, season } = mediaInfo

    const changeType = mediaChangeType(prevMediaInfo.current, mediaInfo)
    logger.debug(`Change type ${changeType}`)

    const handleTitleChange = async () => {
      if (!meta.key)
        throw new Error('meta.key is undefined, this is likely a bug')

      const mappedTitle = getTitleMap(meta.key)

      let results: DanDanAnime[]

      logger.debug(`Title changed to ${title}, fetching media info`)

      if (mappedTitle) {
        logger.debug(`Using mapped title ${meta.key} -> ${mappedTitle}`)
        results = await fetchMediaInfo(mappedTitle)
      } else {
        results = await fetchMediaInfo(title)
      }

      if (results.length === 0) {
        logger.warn(
          `No results found for title ${title}, check if title is parsed correctly or do a manual search`
        )
        return
      }

      await handleSeasonChange(results)
    }

    const handleSeasonChange = async (results: DanDanAnime[]) => {
      const selected = matchAnimeTitle(results, title, season)

      if (!selected) {
        logger.warn('No show matched, please select one manually')
        return
      }

      updateMedia({
        selected,
      })

      await handleEpisodeChange(selected)
    }

    const handleEpisodeChange = async (selected: DanDanAnime) => {
      const currentEpisode = matchAnimeEpisode(selected, episode)

      if (!currentEpisode) {
        logger.warn('No episode matched, is the episode number correct?')
        return
      }

      updateMedia({
        episode: currentEpisode,
      })

      await fetchComments(currentEpisode.episodeId, { withRelated: true }, true)
    }

    switch (changeType) {
      case 'title':
        resetMedia()
        logger.debug(`Title changed to ${title}, fetching media info`)
        handleTitleChange()
        break
      case 'season': {
        logger.debug(`Season changed to ${season}`)
        const results = useStore.getState().media.results
        handleSeasonChange(results)
        break
      }
      case 'episode': {
        logger.debug(`Episode changed to ${episode}`)
        const selected = useStore.getState().media.selected
        if (!selected) {
          logger.warn(
            'Episode change is detected but no show is selected. This is likely a bug'
          )
          return
        }
        handleEpisodeChange(selected)
        break
      }
      default:
        logger.warn(`Change type ${changeType} should not be reached`)
        break
    }

    prevMediaInfo.current = mediaInfo
  }, [mediaInfo])
}
