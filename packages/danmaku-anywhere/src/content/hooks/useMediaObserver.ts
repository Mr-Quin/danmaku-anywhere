import { useEffect } from 'react'

import { MediaInfo } from '../integration/MediaObserver'
import { observers } from '../integration/observers'
import { PopupTab, usePopup } from '../store/popupStore'
import { useStore } from '../store/store'
import { useToast } from '../store/toastStore'

import { useMatchMountConfig } from '@/common/hooks/mountConfig/useMatchMountConfig'
import { animeMessage } from '@/common/messages/animeMessage'
import { danmakuMessage } from '@/common/messages/danmakuMessage'
import { titleMappingMessage } from '@/common/messages/titleMappingMessage'
import { Logger } from '@/common/services/Logger'
import { getEpisodeId, tryCatch } from '@/common/utils'

export const useMediaObserver = () => {
  const config = useMatchMountConfig(window.location.href)

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

  useEffect(() => {
    if (!config) return

    // when config changes, try to find a matching observer
    const Observer = observers.find(
      (integration) => integration.observerName === config.name
    )

    if (!Observer) return // no matching observer found

    Observer.observerName

    toast.info(`Using integration: ${config.name}`)
    Logger.debug(`Using integration: ${config.name}`)

    const obs = new Observer()

    setActiveObserver(Observer.observerName, obs)
  }, [config])

  useEffect(() => {
    if (!activeObserver) return

    activeObserver.setup()

    activeObserver.on({
      mediaChange: async (state: MediaInfo) => {
        resetMediaState()
        setMediaInfo(state)

        const handleError = () => {
          setDanmakuMeta(undefined)
          setComments([])
        }

        const [mapping, mappingErr] = await tryCatch(() =>
          titleMappingMessage.get({
            originalTitle: state.toTitleString(),
            source: config!.name,
          })
        )

        if (mappingErr) {
          toast.error(
            `Failed to get title mapping: ${state.toTitleString()}, skipping`
          )
        }

        if (mapping) {
          Logger.debug(
            `Mapped title found for ${state.toTitleString()}`,
            mapping
          )
          toast.info(
            `Mapped title found: ${state.toTitleString()} -> ${mapping.title}`
          )
        } else {
          Logger.debug(
            `No mapped title found for ${state.toTitleString()}, fallback to ${
              state.title
            }`
          )
        }

        const getDanmakuMeta = async () => {
          if (mapping) {
            return {
              animeId: mapping.animeId,
              animeTitle: mapping.title,
              episodeId: getEpisodeId(mapping.animeId, state.episode),
            }
          }

          const [result, searchErr] = await tryCatch(() =>
            animeMessage.search({
              anime: state.title, // intentionally not using toTitleString() here
              episode: state.episodic ? state.episode.toString() : '',
            })
          )

          if (searchErr) {
            toast.error(`Failed to search for anime: ${state.toString()}`)
            handleError()
            return
          }

          if (result.animes.length === 0) {
            Logger.debug(`No anime found for ${state.toString()}`)
            toast.error(`No anime found for ${state.toString()}`)
            handleError()
            return
          }

          if (result.animes.length > 1) {
            Logger.debug('Multiple animes found, open disambiguation')

            open({ animes: result.animes, tab: PopupTab.Selector })
            return
          }

          // at this point, there should be only one anime
          const { episodes, animeTitle, animeId } = result.animes[0]
          const { episodeId, episodeTitle } = episodes[0]

          return {
            animeId,
            animeTitle,
            episodeId,
            episodeTitle,
          }
        }

        const danmakuMeta = await getDanmakuMeta()

        if (!danmakuMeta) return

        setDanmakuMeta(danmakuMeta)

        const [res, danmakuErr] = await tryCatch(() =>
          danmakuMessage.fetch({
            data: danmakuMeta,
            options: {
              forceUpdate: false,
            },
          })
        )

        if (danmakuErr) {
          toast.error(`Failed to fetch danmaku: ${state.toString()}`)
          handleError()
          return
        }

        setComments(res.comments)
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
      Logger.debug(`Playback started: ${mediaInfo.toString()}`)
    } else if (status === 'paused') {
      Logger.debug(`Playback Paused`)
    } else if (status === 'stopped') {
      Logger.debug(`Playback Stopped`)
    }
  }, [status, mediaInfo])

  return activeObserver
}
