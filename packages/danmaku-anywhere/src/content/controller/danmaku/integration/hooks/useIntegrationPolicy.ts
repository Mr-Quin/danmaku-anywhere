import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { getTrackingService } from '@/common/hooks/tracking/useSetupTracking'
import { Logger } from '@/common/Logger'
import { integrationData } from '@/common/options/mountConfig/integrationData'
import { isConfigPermissive } from '@/common/options/mountConfig/isPermissive'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
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
  const activeConfig = useActiveConfig()

  useEffect(() => {
    if (!activeConfig) {
      return
    }
    if (activeConfig.mode !== 'manual') {
      toggleManualMode(false)
      toast.info(
        t('integration.alert.usingMode', 'Using Mode: {{mode}}', {
          mode: integrationData[activeConfig.mode].label(),
        })
      )
    } else {
      toggleManualMode(true)
    }
    Logger.debug(`Using mode: ${activeConfig.mode}`)
  }, [activeConfig])

  useEffect(() => {
    if (activeConfig?.mode === 'custom' && !integrationPolicy) {
      toast.warn(
        t(
          'integration.alert.noIntegration',
          'Integration policy not configured'
        )
      )
    }
  }, [activeConfig, integrationPolicy])

  useEffect(() => {
    if (
      !videoId ||
      !activeConfig ||
      isManual ||
      (!integrationPolicy && activeConfig.mode === 'custom')
    ) {
      if (observer.current) {
        Logger.debug('Destroying integration observer')
        observer.current?.destroy()
        observer.current = undefined
        deactivate()
      }
      return
    }

    if (isConfigPermissive(activeConfig) && activeConfig.mode === 'ai') {
      toast.warn(
        t(
          'integration.alert.aiDisabledTooPermissive',
          'AI is disabled because the mount config is too permissive'
        )
      )
      return
    }

    // Create the observer if it hasn't been created yet
    if (!observer.current) {
      activate()
      observer.current = new IntegrationPolicyObserver(
        integrationPolicy?.policy ?? null,
        {
          useAi: activeConfig.mode === 'ai',
        }
      )

      observer.current.on({
        mediaChange: (state: MediaInfo) => {
          getTrackingService().track('integrationPolicyMediaChange', {
            mediaInfo: state.toJSON(),
            policy: integrationPolicy,
          })
          if (observer.current?.getOptions().useAi) {
            toast.success(
              t('integration.alert.AIResult', 'AI Parsing Result: {{title}}', {
                title: state.toString(),
              })
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

          toast.info(
            t('integration.alert.search', 'Searching for anime: {{title}}', {
              title: state.toString(),
            })
          )

          matchEpisode.mutate(episodeMatchPayload, {
            onSuccess: (result) => {
              if (result.data.status !== 'success') {
                return
              }
              if (result.data.data.provider === DanmakuSourceType.MacCMS) {
                toast.success(
                  t(
                    'integration.alert.matchedLocalDanmaku',
                    'Matched local danmaku'
                  )
                )
                void mountDanmaku([result.data.data])
              } else {
                loadMutation.mutate(
                  {
                    type: 'by-meta',
                    meta: result.data.data,
                    options: {
                      forceUpdate: false,
                    },
                  },
                  {
                    onError: () => {
                      toast.error(
                        t(
                          'danmaku.alert.fetchError',
                          'Failed to fetch danmaku: {{message}}',
                          {
                            message: episodeMatchPayload.title,
                          }
                        )
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
          getTrackingService().track('integrationPolicyError', { error })
          toast.error(error.message)
          setErrorMessage(error.message)
        },
      })

      if (activeConfig.mode === 'ai') {
        toast.info(
          t('integration.alert.usingAI', 'Using AI to parse show information')
        )
      }
    }

    observer.current.setup(integrationPolicy?.policy)

    return () => {
      observer.current?.reset()
    }
  }, [activeConfig, integrationPolicy, isManual, videoId])
}
