import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { PopupTab, usePopup } from '../../store/popupStore'
import { useStore } from '../../store/store'
import type { MediaInfo } from '../integration/MediaObserver'

import { useMatchObserver } from './useMatchObserver'

import { useToast } from '@/common/components/toast/toastStore'
import { useAnimeSearchSuspense } from '@/common/queries/anime/useAnimeSearchSuspense'
import { chromeRpcClient } from '@/common/rpc/client'
import { Logger } from '@/common/services/Logger'
import { DanmakuType } from '@/common/types/danmaku/Danmaku'
import { getEpisodeId } from '@/common/utils/danmaku'
import { tryCatch } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'

export const useMediaObserver = () => {
  const { t } = useTranslation()
  const config = useActiveConfig()

  const { toast } = useToast()
  const { open } = usePopup()

  const activeObserver = useMatchObserver()

  const {
    mediaInfo,
    setMediaInfo,
    playbackStatus,
    setPlaybackStatus,
    setDanmakuMeta,
    setComments,
    resetMediaState,
  } = useStore(useShallow((state) => state))

  const queryClient = useQueryClient()

  const { mutate } = useMutation({
    mutationFn: chromeRpcClient.titleMappingSet,
    throwOnError: false,
  })

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
            t('integration.alert.titleMappingError', {
              title: state.toTitleString(),
            })
          )
          Logger.error(mappingErr)
        }

        if (mapping) {
          Logger.debug(
            `Mapped title found for ${state.toTitleString()}`,
            mapping
          )
          toast.info(
            t('integration.alert.titleMapping', {
              originalTitle: state.toTitleString(),
              mappedTitle: mapping.title,
            })
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
              type: DanmakuType.DDP,
            } as const
          }

          // if no mapping, search for anime to get the animeId
          const [animes, searchErr] = await tryCatch(() =>
            queryClient.fetchQuery({
              queryKey: useAnimeSearchSuspense.queryKey({
                anime: state.title,
                episode: state.episodic ? state.episode.toString() : '',
              }),
              queryFn: () =>
                chromeRpcClient.animeSearch({
                  anime: state.title,
                  episode: state.episodic ? state.episode.toString() : '',
                }),
            })
          )

          if (searchErr) {
            toast.error(
              t('integration.alert.searchError', { message: state.title })
            )
            handleError()
            return
          }

          if (animes.length === 0) {
            Logger.debug(`No anime found for ${state.toString()}`)
            toast.error(
              t('integration.alert.searchResultEmpty', { title: state.title }),
              {
                actionFn: () => open({ tab: PopupTab.Search }),
                actionLabel: t('integration.alert.openSearch'),
              }
            )
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
            type: DanmakuType.DDP,
          } as const
        }

        const danmakuMeta = await getDanmakuMeta()

        if (!danmakuMeta) return

        const [res, danmakuErr] = await tryCatch(() =>
          queryClient.fetchQuery({
            queryKey: ['danmaku', 'fetch', danmakuMeta],
            queryFn: () =>
              chromeRpcClient.danmakuFetchDDP({
                meta: danmakuMeta,
                options: {
                  forceUpdate: false,
                },
              }),
          })
        )

        if (danmakuErr) {
          toast.error(
            t('danmaku.alert.fetchError', {
              message: state.toString(),
            })
          )
          handleError()
          return
        }

        setDanmakuMeta(res.meta)
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
      toast.info(
        t('integration.alert.playing', { title: mediaInfo.toString() })
      )
      Logger.debug(`Playback started: ${mediaInfo.toString()}`)
    } else if (playbackStatus === 'paused') {
      Logger.debug(`Playback Paused`)
    } else if (playbackStatus === 'stopped') {
      useStore.getState().resetMediaState()
      Logger.debug(`Playback Stopped`)
    }
  }, [playbackStatus, mediaInfo])

  return activeObserver
}
