import { useEffect } from 'react'
import { searchAnime } from '@danmaku-anywhere/danmaku-engine'
import { useToast } from '../store/toastStore'
import { MediaState } from '../integration/MediaObserver'
import { useStore } from '../store/store'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMountConfig'
import { contentLogger } from '@/common/logger'
import { danmakuAction } from '@/common/messages/danmakuMessage'

export const useMediaObserver = () => {
  const { toast, openAnimePopup } = useToast()

  const {
    mediaInfo,
    setMediaInfo,
    status,
    setStatus,
    activeObserver,
    setActiveObserver,
    observers,
    setComments,
  } = useStore()

  const config = useMatchMountConfig(window.location.href)

  useEffect(() => {
    if (!config) return
    // when config changes, try to find a matching observer

    const Observer = observers.find(
      (integration) => integration.observerName === config.name
    )

    if (!Observer) return

    toast.info(`Using integration: ${config.name}`)
    contentLogger.debug(`Using integration: ${config.name}`)

    const obs = new Observer()

    setActiveObserver(Observer.observerName, obs)
  }, [config, observers])

  useEffect(() => {
    if (!activeObserver) return

    activeObserver.setup()

    activeObserver.on({
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
          contentLogger.debug('Multiple animes found, open disambiguation')

          // open popup to let user choose which anime to use
          openAnimePopup(result.animes)
        } else {
          const { episodes, animeTitle, animeId } = result.animes[0]
          const { episodeId, episodeTitle } = episodes[0]

          contentLogger.debug(
            `Fetching danmaku for: ${animeTitle} Id${animeId}`
          )

          const res = await danmakuAction.fetch({
            data: {
              animeId,
              animeTitle,
              episodeId,
              episodeTitle,
            },
            options: {
              forceUpdate: false,
            },
          })

          contentLogger.debug('Danmaku fetch result:', res)

          toast.info(
            `Danmaku mounted: ${animeTitle} E${episodeTitle} (${res.payload.count})`
          )

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

    return () => activeObserver.destroy()
  }, [activeObserver])

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
