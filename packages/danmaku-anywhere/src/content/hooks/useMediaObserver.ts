import { useEffect } from 'react'
import { useToast } from '../store/toastStore'
import { MediaState } from '../integration/MediaObserver'
import { useStore } from '../store/store'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { logger } from '@/common/logger'
import { danmakuMessage } from '@/common/messages/danmakuMessage'
import { tryCatch } from '@/common/utils'
import { animeMessage } from '@/common/messages/animeMessage'

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
    logger.debug(`Using integration: ${config.name}`)

    const obs = new Observer()

    setActiveObserver(Observer.observerName, obs)
  }, [config])

  useEffect(() => {
    if (!activeObserver) return

    activeObserver.setup()

    activeObserver.on({
      mediaChange: async (state: MediaState) => {
        setMediaInfo(state)

        const [result, error] = await tryCatch(() =>
          animeMessage.search({
            anime: state.title,
            episode: state.episode.toString(),
          })
        )

        if (error) {
          toast.error(`Failed to search for anime: ${state.title}`)
          return
        }

        if (result.animes.length === 0) {
          toast.error(
            `No anime found for ${state.title} S${state.season} E${state.episode}`
          )
        } else if (result.animes.length > 1) {
          logger.debug('Multiple animes found, open disambiguation')

          // open popup to let user choose which anime to use
          openAnimePopup(result.animes)
        } else {
          const { episodes, animeTitle, animeId } = result.animes[0]
          const { episodeId, episodeTitle } = episodes[0]

          try {
            const res = await danmakuMessage.fetch({
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

            setComments(res.comments)
          } catch (err) {
            toast.error(
              `Failed to fetch danmaku: ${animeTitle} E${episodeTitle}`
            )
            return
          }
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
      logger.debug(`Playing: ${mediaInfo.toString()}`)
    } else if (status === 'paused') {
      logger.debug(`Playback Paused`)
    } else if (status === 'stopped') {
      logger.debug(`Playback Stopped`)
    }
  }, [status, mediaInfo])
}
