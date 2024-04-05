import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'

import type { MediaInfo } from '../integration/MediaObserver'
import { observersMap } from '../integration/observers'
import { PopupTab, usePopup } from '../../store/popupStore'
import { useStore } from '../../store/store'
import { useToast } from '../../store/toastStore'

import type { MountConfig } from '@/common/constants/mountConfig'
import { chromeRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import { getEpisodeId, tryCatch } from '@/common/utils'

export const useMediaObserver = (config: MountConfig) => {
  const { toast } = useToast()
  const { open } = usePopup()

  const {
    mediaInfo,
    setMediaInfo,
    playbackStatus,
    setPlaybackStatus,
    activeObserver,
    setDanmakuMeta,
    setObserver,
    unsetObserver,
    setComments,
    resetMediaState,
  } = useStore(useShallow((state) => state))

  const queryClient = useQueryClient()

  const { mutate } = useMutation({
    mutationFn: chromeRpcClient.titleMappingSet,
    throwOnError: false,
  })

  useEffect(() => {
    // when config changes, try to find a matching observer
    const Observer = observersMap[config.name]

    if (!Observer) return // no matching observer found

    toast.info(`Using integration: ${config.name}`)
    Logger.debug(`Using integration: ${config.name}`)

    const obs = new Observer()

    setObserver(config.name, obs)

    return () => unsetObserver()
  }, [config])

  useEffect(() => {
    if (!activeObserver) return

    activeObserver.on({
      mediaChange: async (state: MediaInfo) => {
        resetMediaState()
        setMediaInfo(state)

        const handleError = () => {
          setDanmakuMeta(undefined)
          setComments([])
        }

        const titleMappingPayload = {
          originalTitle: state.toTitleString(),
          source: config.name,
        }

        const [mapping, mappingErr] = await tryCatch(() =>
          queryClient.fetchQuery({
            queryKey: ['titleMapping', titleMappingPayload],
            queryFn: () => chromeRpcClient.titleMappingGet(titleMappingPayload),
          })
        )

        if (mappingErr) {
          toast.error(
            `Failed to get title mapping: ${state.toTitleString()}, skipping`
          )
          Logger.error(mappingErr)
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
          // if mapping exists, use the mapped animeId and calculate the episodeId
          if (mapping) {
            return {
              animeId: mapping.animeId,
              animeTitle: mapping.title,
              episodeId: getEpisodeId(mapping.animeId, state.episode),
            }
          }

          // if no mapping, search for anime to get the animeId
          const [animes, searchErr] = await tryCatch(() =>
            queryClient.fetchQuery({
              queryKey: ['anime', state],
              queryFn: () =>
                chromeRpcClient.animeSearch({
                  anime: state.title,
                  episode: state.episodic ? state.episode.toString() : '',
                }),
            })
          )

          if (searchErr) {
            toast.error(`Failed to search for anime: ${state.toString()}`)
            handleError()
            return
          }

          if (animes.length === 0) {
            Logger.debug(`No anime found for ${state.toString()}`)
            toast.error(`No anime found for ${state.toString()}`)
            handleError()
            return
          }

          if (animes.length > 1) {
            Logger.debug('Multiple animes found, open disambiguation')

            // the popup is responsible for setting the danmaku meta
            open({ animes: animes, tab: PopupTab.Selector })
            return
          }

          // at this point, there should be only one anime
          const { episodes, animeTitle, animeId } = animes[0]
          const { episodeId, episodeTitle } = episodes[0]

          // save the result to title mapping
          // no need to await, it's ok if it fails
          mutate({
            ...titleMappingPayload,
            title: animeTitle,
            animeId,
          })

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
          queryClient.fetchQuery({
            queryKey: ['danmaku', 'fetch', danmakuMeta],
            queryFn: () =>
              chromeRpcClient.danmakuFetch({
                data: danmakuMeta,
                options: {
                  forceUpdate: false,
                },
              }),
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
        setPlaybackStatus(status)
      },
    })

    activeObserver.setup()

    return () => activeObserver.destroy()
  }, [activeObserver])

  useEffect(() => {
    if (!mediaInfo) return

    if (playbackStatus === 'playing') {
      toast.info(`Playing: ${mediaInfo.toString()}`)
      Logger.debug(`Playback started: ${mediaInfo.toString()}`)
    } else if (playbackStatus === 'paused') {
      Logger.debug(`Playback Paused`)
    } else if (playbackStatus === 'stopped') {
      Logger.debug(`Playback Stopped`)
    }
  }, [playbackStatus, mediaInfo])

  return activeObserver
}
