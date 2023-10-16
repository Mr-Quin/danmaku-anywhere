import { useEffect, useState } from 'react'
import { searchAnime } from '@danmaku-anywhere/danmaku-engine'
import { useToast } from '../toastStore'
import { PlexObserver } from '../integration/Plex'
import {
  MediaState,
  MediaObserver,
  PlaybackStatus,
} from '../integration/MediaObserver'
import { useStore } from '../store'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { contentLogger } from '@/common/logger'
import { createDanmakuAction } from '@/common/danmakuMessage'

const observers = [PlexObserver]

export const useMediaObserver = () => {
  const [mediaInfo, setMediaInfo] = useState<MediaState>()
  const [status, setStatus] = useState<PlaybackStatus>()

  const [observer, setObserver] = useState<MediaObserver>()

  const { toast } = useToast()

  const setComments = useStore((state) => state.setComments)

  const config = useMatchMountConfig(window.location.href)

  useEffect(() => {
    if (!config) return

    const Observer = observers.find(
      (integration) => integration.observerName === config.name
    )

    if (!Observer) return

    toast.info(`Using integration: ${config.name}`)

    const obs = new Observer()

    setObserver(obs)
  }, [config])

  useEffect(() => {
    if (!observer) return

    observer.setup()

    observer.on({
      mediaChange: async (state: MediaState) => {
        setMediaInfo(state)

        contentLogger.debug('Searching for anime:', state.toString())

        const result = await searchAnime({
          anime: state.title,
          episode: state.episode.toString(),
        })

        contentLogger.debug('Anime search result:', result)

        if (result.animes.length === 0) {
          toast.error(
            `No anime found for ${state.title} S${state.season} E${state.episode}`
          )
        } else if (result.animes.length > 1) {
          toast.warn(`Multiple anime found: ${JSON.stringify(result.animes)}`)
        } else {
          const { episodes, animeTitle, animeId } = result.animes[0]
          const { episodeId, episodeTitle } = episodes[0]

          contentLogger.debug(
            `Fetching danmaku for: ${animeTitle} Id${animeId}`
          )

          const res = await chrome.runtime.sendMessage(
            createDanmakuAction({
              action: 'danmaku/fetch',
              payload: {
                data: {
                  animeId,
                  animeTitle,
                  episodeId,
                  episodeTitle,
                },
                options: {
                  forceUpdate: false,
                },
              },
            })
          )

          contentLogger.debug('Danmaku fetch result:', res)

          setComments(res.payload.comments)
        }
      },
      statusChange: (status) => {
        if (status === 'stopped') {
          setComments([])
        }
        setStatus(status)
      },
    })

    return () => observer.destroy()
  }, [observer])

  useEffect(() => {
    if (!mediaInfo) return

    if (status === 'playing') {
      toast.info(`Playing: ${mediaInfo.toString()}`)
    } else if (status === 'paused') {
      toast.info(`Playback Paused`)
    } else if (status === 'stopped') {
      toast.info(`Playback Stopped`)
    }
  }, [status, mediaInfo])
}
