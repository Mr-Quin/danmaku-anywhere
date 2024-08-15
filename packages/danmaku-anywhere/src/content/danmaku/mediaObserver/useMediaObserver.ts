import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { PopupTab, usePopup } from '../../store/popupStore'
import { useStore } from '../../store/store'

import { useMatchObserver } from './useMatchObserver'

import { useAnimeSearchSuspense } from '@/common/anime/queries/useAnimeSearchSuspense'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanDanPlayMetaDto } from '@/common/danmaku/models/meta'
import { computeEpisodeId } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { tryCatch } from '@/common/utils/utils'
import { useActiveConfig } from '@/content/common/hooks/useActiveConfig'
import type { MediaInfo } from '@/content/danmaku/integration/MediaInfo'

export const useMediaObserver = () => {
  const { t } = useTranslation()
  const config = useActiveConfig()

  const { toast } = useToast()
  const { open, setAnimes } = usePopup()

  const activeObserver = useMatchObserver()

  const {
    mediaInfo,
    setMediaInfo,
    playbackStatus,
    setPlaybackStatus,
    setDanmakuLite,
    setComments,
    resetMediaState,
  } = useStore(useShallow((state) => state))

  const queryClient = useQueryClient()

  const { mutate } = useMutation({
    mutationFn: chromeRpcClient.titleMappingSet,
    throwOnError: false,
    onError: (error) => {
      Logger.error(error)
    },
  })

  useEffect(() => {
    if (!activeObserver) return

    activeObserver.on({
      mediaChange: async (state: MediaInfo) => {
        resetMediaState()
        setMediaInfo(state)

        const handleError = () => {
          resetMediaState(state)
        }

        const titleMappingPayload = {
          originalTitle: state.toTitleString(),
          integration: config.integration,
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

        const getDanmakuMeta = async (): Promise<
          DanDanPlayMetaDto | undefined
        > => {
          // if mapping exists, use the mapped animeId and calculate the episodeId
          if (mapping) {
            return {
              animeId: mapping.animeId,
              animeTitle: mapping.title,
              episodeId: computeEpisodeId(mapping.animeId, state.episode),
              provider: DanmakuSourceType.DDP,
            }
          }

          // if no mapping, search for anime to get the animeId
          const [anime, searchErr] = await tryCatch(() =>
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

          if (anime.length === 0) {
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

          if (anime.length > 1) {
            Logger.debug('Multiple anime found, open disambiguation')

            // the popup is responsible for setting the danmaku meta
            setAnimes(anime)
            open({ animes: anime, tab: PopupTab.Selector })
            return
          }

          // at this point, there should be only one anime
          const { episodes, animeTitle, animeId } = anime[0]
          const { episodeId, episodeTitle } = episodes[0]

          // save the result to title mapping
          // no need to await, it's ok if it fails
          mutate({
            ...titleMappingPayload,
            title: animeTitle,
            animeId,
          })

          return {
            animeId: animeId,
            animeTitle: animeTitle,
            episodeId,
            episodeTitle,
            provider: DanmakuSourceType.DDP,
          }
        }

        const danmakuMeta = await getDanmakuMeta()

        if (!danmakuMeta) return

        const [res, danmakuErr] = await tryCatch(() =>
          queryClient.fetchQuery({
            queryKey: ['danmaku', 'fetch', danmakuMeta],
            queryFn: () =>
              chromeRpcClient.danmakuFetch({
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

        setDanmakuLite(res)
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
