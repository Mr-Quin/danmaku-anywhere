import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { Logger } from '@/common/Logger'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useMatchEpisode } from '@/content/controller/danmaku/integration/hooks/useMatchEpisode'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { IntegrationPolicyObserver } from '@/content/controller/danmaku/integration/observers/IntegrationPolicyObserver'
import { useStore } from '@/content/controller/store/store'

export const useIntegrationPolicy = () => {
  const { t } = useTranslation()

  const { toast } = useToast()

  const observer = useRef<IntegrationPolicyObserver>(undefined)

  const videoId = useStore.use.videoId?.()
  const { toggleManualMode, isManual } = useStore.use.danmaku()
  const unmountDanmaku = useUnmountDanmaku()
  const {
    setMediaInfo,
    setErrorMessage,
    activate,
    deactivate,
    setFoundElements,
  } = useStore.use.integration()

  const matchEpisode = useMatchEpisode()
  const { loadMutation, mountDanmaku } = useLoadDanmaku()

  const integrationPolicy = useActiveIntegration()

  useEffect(() => {
    if (!integrationPolicy) {
      toggleManualMode(true)
      return
    }

    toggleManualMode(false)

    toast.info(
      t('integration.alert.usingIntegration', { name: integrationPolicy.name })
    )
    Logger.debug(`Using integration: ${integrationPolicy.name}`)
  }, [integrationPolicy])

  useEffect(() => {
    if (!videoId || !integrationPolicy || isManual) {
      if (observer.current) {
        Logger.debug('Destroying integration observer')
        observer.current?.destroy()
        observer.current = undefined
        deactivate()
      }
      return
    }

    // Create the observer if it hasn't been created yet
    if (!observer.current) {
      activate()
      observer.current = new IntegrationPolicyObserver(integrationPolicy.policy)

      observer.current.on({
        mediaChange: async (state: MediaInfo) => {
          if (observer.current?.policy.options.useAI) {
            toast.success(
              t('integration.alert.AIResult', { title: state.toString() })
            )
          }
          if (useStore.getState().danmaku.isMounted) {
            unmountDanmaku.mutate()
          }
          setMediaInfo(state)
          setErrorMessage()

          const episodeMatchPayload = {
            mapKey: state.getKey(),
            title: state.seasonTitle,
            episodeNumber: state.episode,
          }

          toast.info(t('integration.alert.search', { title: state.toString() }))

          matchEpisode.mutate(episodeMatchPayload, {
            onSuccess: (result) => {
              if (result.data.status !== 'success') {
                return
              }
              if (result.data.data.provider === DanmakuSourceType.Custom) {
                toast.success(t('integration.alert.matchedLocalDanmaku'))
                mountDanmaku([result.data.data])
              } else {
                loadMutation.mutate(
                  {
                    meta: result.data.data,
                    options: {
                      forceUpdate: false,
                    },
                  },
                  {
                    onError: () => {
                      toast.error(
                        t('danmaku.alert.fetchError', {
                          message: episodeMatchPayload.title,
                        })
                      )
                    },
                  }
                )
              }
            },
          })
        },
        mediaElementsChange: () => {
          setFoundElements(true)
        },
        error: (error: Error) => {
          toast.error(error.message)
          setErrorMessage(error.message)
        },
      })

      if (integrationPolicy.policy.options.useAI) {
        toast.info(t('integration.alert.usingAI'))
      }
    }

    observer.current.setup(integrationPolicy.policy)

    return () => {
      observer.current?.reset()
    }
  }, [integrationPolicy, isManual, videoId])
}
