import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { getTrackingService } from '@/common/hooks/tracking/useSetupTracking'
import { Logger } from '@/common/Logger'
import { isConfigPermissive } from '@/common/options/mountConfig/isPermissive'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useMatchEpisode } from '@/content/controller/danmaku/integration/hooks/useMatchEpisode'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import type { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { ObserverFactory } from '@/content/controller/danmaku/integration/observers/ObserverFactory'
import { useStore } from '@/content/controller/store/store'
import { useSyncIntegrationManualMode } from './useSyncIntegrationManualMode'
import { useWarnIncompleteConfig } from './useWarnIncompleteConfig'

export const useIntegrationPolicy = () => {
  const { t } = useTranslation()

  const { toast } = useToast()

  const [observer, setObserver] = useState<MediaObserver | null>(null)

  const videoId = useStore.use.videoId?.()
  const unmountDanmaku = useUnmountDanmaku()
  const {
    setMediaInfo,
    setErrorMessage,
    activate,
    deactivate,
    setFoundElements,
    resetIntegration,
  } = useStore.use.integration()

  const matchEpisode = useMatchEpisode()
  const { loadMutation, mountDanmaku } = useLoadDanmaku()

  const integrationPolicy = useActiveIntegration()
  const activeConfig = useActiveConfig()

  const isManual = useSyncIntegrationManualMode()
  const isConfigIncomplete = useWarnIncompleteConfig()

  useEffect(() => {
    if (isManual || isConfigIncomplete) {
      if (observer) {
        Logger.debug(
          'Destroying integration observer because manual mode or config is incomplete'
        )
        observer.destroy()
        setObserver(null)
        deactivate()
        resetIntegration()
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

    const newObserver = ObserverFactory.create(
      activeConfig.mode,
      integrationPolicy?.policy ?? null
    )
    Logger.debug('Created integration observer', newObserver.name)

    activate()

    newObserver.on({
      mediaChange: (state: MediaInfo) => {
        getTrackingService().track('integrationPolicyMediaChange', {
          mediaInfo: state.toJSON(),
          policy: integrationPolicy,
        })
        if (activeConfig.mode === 'ai') {
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

    newObserver.setup()
    setObserver(newObserver)

    return () => {
      newObserver.destroy()
      setObserver(null)
    }
  }, [activeConfig, integrationPolicy, isManual, isConfigIncomplete])

  useEffect(() => {
    if (!observer) {
      return
    }
    if (videoId) {
      observer.run()
    } else {
      observer.reset()
      resetIntegration()
    }
  }, [videoId, observer])
}
