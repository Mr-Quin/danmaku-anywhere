import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { isCustomEpisode } from '@/common/danmaku/utils'
import { Logger } from '@/common/Logger'
import { isConfigPermissive } from '@/common/options/mountConfig/isPermissive'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { describeMountError } from '@/content/controller/common/hooks/mountError'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { episodeToast } from '@/content/controller/danmaku/integration/episodeToast'
import { useMatchEpisode } from '@/content/controller/danmaku/integration/hooks/useMatchEpisode'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import type { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { ObserverFactory } from '@/content/controller/danmaku/integration/observers/ObserverFactory'
import { useStore } from '@/content/controller/store/store'
import { useDescribeSourceError } from './useDescribeSourceError'
import { useSyncIntegrationManualMode } from './useSyncIntegrationManualMode'
import { useWarnIncompleteConfig } from './useWarnIncompleteConfig'

export const useIntegrationPolicy = () => {
  const { t } = useTranslation()

  const { toast } = useToast()

  const [observer, setObserver] = useState<MediaObserver | null>(null)

  const activeFrameVideoKey = useStore((s) => {
    const af = s.frame.activeFrame
    if (!af?.hasVideo) {
      return undefined
    }
    return `${af.frameId}:${af.videoChangeCount}`
  })
  const unmountDanmaku = useUnmountDanmaku({ silent: true })
  const {
    setMediaInfo,
    setErrorMessage,
    activate,
    deactivate,
    setFoundElements,
    resetIntegration,
  } = useStore.use.integration()

  const matchEpisode = useMatchEpisode()
  const describeSourceError = useDescribeSourceError()
  const { loadMutation, mountDanmaku, describeMounted } = useLoadDanmaku()

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
      activeConfig,
      integrationPolicy?.policy ?? null
    )
    Logger.debug('Created integration observer', newObserver.name)

    activate()

    newObserver.on({
      statusChange: (status: string) => {
        if (status === 'Extracting video info using AI...') {
          episodeToast.start(
            t('integration.alert.usingAI', 'Using AI to parse show information')
          )
        }
      },
      mediaChange: (state: MediaInfo) => {
        getTrackingService().track('integrationPolicyMediaChange', {
          mediaInfo: state.toJSON(),
          policy: integrationPolicy,
        })
        if (useStore.getState().danmaku.isMounted) {
          unmountDanmaku.mutate()
        }

        setMediaInfo(state)
        setErrorMessage()

        const name = state.toString()
        episodeToast.start(
          t('integration.alert.finding', 'Finding danmaku for {{name}}…', {
            name,
          })
        )

        const episodeMatchPayload = {
          mapKey: state.getKey(),
          title: state.title,
          episodeNumber: state.episode,
          originalTitle: state.originalTitle,
        }

        matchEpisode.mutate(episodeMatchPayload, {
          onSuccess: (result) => {
            if (result.data.status !== 'success') {
              return
            }
            const matched = result.data.data
            if (isCustomEpisode(matched)) {
              mountDanmaku([matched], { silent: true }).then(
                () => {
                  // A local file's title often names only the show.
                  const { message, ...action } = describeMounted(matched, name)
                  episodeToast.succeed(message, action)
                },
                (error: unknown) => episodeToast.fail(describeMountError(error))
              )
              return
            }
            loadMutation.mutate(
              {
                request: {
                  type: 'by-meta',
                  meta: matched,
                  options: {
                    forceUpdate: false,
                    automatic: true,
                  },
                },
                silent: true,
              },
              {
                onSuccess: ({ episode, mounted, mountError }) => {
                  if (mountError !== undefined) {
                    episodeToast.fail(describeMountError(mountError))
                    return
                  }
                  if (!mounted) {
                    episodeToast.dismiss()
                    return
                  }
                  const { message, ...action } = describeMounted(episode)
                  episodeToast.succeed(message, action)
                },
                onError: (error) => {
                  const { message, ...action } = describeSourceError({
                    error,
                    describeFailure: (reason) =>
                      t(
                        'danmaku.alert.fetchError',
                        'Failed to fetch danmaku: {{message}}',
                        { message: reason }
                      ),
                    providerConfigId: matched.season.providerConfigId,
                  })
                  episodeToast.fail(message, action)
                },
              }
            )
          },
        })
      },
      mediaElementsChange: () => {
        setFoundElements(true)
      },
      error: (error: Error) => {
        getTrackingService().track('integrationPolicyError', { error })
        episodeToast.fail(error.message)
        setErrorMessage(error.message)
      },
    })

    newObserver.setup()
    setObserver(newObserver)

    return () => {
      episodeToast.cancel()
      newObserver.destroy()
      setObserver(null)
    }
  }, [activeConfig, integrationPolicy, isManual, isConfigIncomplete])

  useEffect(() => {
    if (!observer) {
      return
    }
    if (activeFrameVideoKey !== undefined) {
      observer.run()
    } else {
      observer.reset()
      episodeToast.cancel()
      resetIntegration()
    }
  }, [activeFrameVideoKey, observer])
}
