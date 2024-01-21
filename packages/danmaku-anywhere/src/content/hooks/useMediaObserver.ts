import { useEffect } from 'react'
import { useToast } from '../store/toastStore'
import { PopupTab, usePopup } from '../store/popupStore'
import { MediaState } from '../integration/MediaObserver'
import { useStore } from '../store/store'
import { observers } from '../integration/observers'
import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { logger } from '@/common/logger'
import { danmakuMessage } from '@/common/messages/danmakuMessage'
import { tryCatch } from '@/common/utils'
import { animeMessage } from '@/common/messages/animeMessage'

export const useMediaObserver = () => {
  const { toast } = useToast()
  const { open } = usePopup()

  const {
    mediaInfo,
    setMediaInfo,
    status,
    setStatus,
    setDanmakuMeta,
    activeObserver,
    setActiveObserver,
    setComments,
    resetMediaState,
  } = useStore()

  const config = useMatchMountConfig(window.location.href)

  useEffect(() => {
    if (!config) return

    // when config changes, try to find a matching observer
    const Observer = observers.find(
      (integration) => integration.observerName === config.name
    )

    if (!Observer) return // no matching observer found

    Observer.observerName

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
        resetMediaState()
        setMediaInfo(state)

        const [result, err] = await tryCatch(() =>
          animeMessage.search({
            anime: state.title,
            episode: state.episode.toString(),
          })
        )

        if (err) {
          toast.error(`Failed to search for anime: ${state.title}`)
          return
        }

        if (result.animes.length === 0) {
          toast.error(
            `No anime found for ${state.title} S${state.season} E${state.episode}`
          )
        } else if (result.animes.length > 1) {
          logger.debug('Multiple animes found, open disambiguation')

          open({ animes: result.animes, tab: PopupTab.Selector })
        } else {
          // only one anime found, continue to fetch danmaku
          const { episodes, animeTitle, animeId } = result.animes[0]
          const { episodeId, episodeTitle } = episodes[0]

          const danmakuMeta = {
            animeId,
            animeTitle,
            episodeId,
            episodeTitle,
          }

          setDanmakuMeta(danmakuMeta)

          const [res, err] = await tryCatch(() =>
            danmakuMessage.fetch({
              data: danmakuMeta,
              options: {
                forceUpdate: false,
              },
            })
          )

          if (err) {
            toast.error(
              `Failed to fetch danmaku: ${animeTitle} E${episodeTitle}`
            )
            return
          }

          setComments(res.comments)
        }
      },
      statusChange: (status) => {
        setStatus(status)
      },
    })

    return () => activeObserver.destroy()
  }, [activeObserver])

  useEffect(() => {
    if (!mediaInfo) return

    if (status === 'playing') {
      toast.info(`Playing: ${mediaInfo.toString()}`)
      logger.debug(`Playback started: ${mediaInfo.toString()}`)
    } else if (status === 'paused') {
      logger.debug(`Playback Paused`)
    } else if (status === 'stopped') {
      logger.debug(`Playback Stopped`)
    }
  }, [status, mediaInfo])
}
