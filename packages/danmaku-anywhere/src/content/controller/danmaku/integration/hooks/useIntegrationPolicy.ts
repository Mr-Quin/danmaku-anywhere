import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { uiContainer } from '@/common/ioc/uiIoc'
import { Logger } from '@/common/Logger'
import { integrationData } from '@/common/options/mountConfig/integrationData'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { useLoadDanmaku } from '@/content/controller/common/hooks/useLoadDanmaku'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import { useMatchEpisode } from '@/content/controller/danmaku/integration/hooks/useMatchEpisode'
import { IntegrationService } from '@/content/controller/danmaku/integration/IntegrationService'
import { useStore } from '@/content/controller/store/store'

const integrationService = uiContainer.get(IntegrationService)

export const useIntegrationPolicy = () => {
  const { t } = useTranslation()
  const { toast } = useToast()

  const activeFrameVideoKey = useStore((s) => {
    const af = s.frame.activeFrame
    if (!af?.hasVideo) {
      return undefined
    }
    return `${af.frameId}:${af.videoChangeCount}`
  })

  const matchEpisode = useMatchEpisode()
  const { loadMutation, mountDanmaku } = useLoadDanmaku()
  const unmountDanmaku = useUnmountDanmaku()

  const integrationPolicy = useActiveIntegration()
  const activeConfig = useActiveConfig()

  const prevVideoKeyRef = useRef<string | undefined>(undefined)

  // Config/policy change → update service
  useEffect(() => {
    const { warning } = integrationService.handleConfigChange(
      activeConfig,
      integrationPolicy?.policy ?? null
    )

    if (warning === 'incomplete') {
      toast.warn(
        t(
          'integration.alert.noIntegration',
          'Integration policy not configured'
        )
      )
    } else if (warning === 'permissive') {
      toast.warn(
        t(
          'integration.alert.aiDisabledTooPermissive',
          'AI is disabled because the mount config is too permissive'
        )
      )
    } else if (activeConfig.mode !== 'manual') {
      toast.info(
        t('integration.alert.usingMode', 'Using Mode: {{mode}}', {
          mode: integrationData[activeConfig.mode].label(),
        })
      )
    }

    // Sync manual mode to store
    useStore.getState().danmaku.toggleManualMode(activeConfig.mode === 'manual')
    Logger.debug(`Using mode: ${activeConfig.mode}`)
  }, [activeConfig, integrationPolicy])

  // Video state change → tell service
  useEffect(() => {
    const hasVideo = activeFrameVideoKey !== undefined
    const videoChanged = activeFrameVideoKey !== prevVideoKeyRef.current

    prevVideoKeyRef.current = activeFrameVideoKey

    if (!videoChanged) {
      return
    }

    integrationService.handleVideoChange(hasVideo)
  }, [activeFrameVideoKey])

  // Subscribe to machine state changes for side effects (toasts, mutations)
  useEffect(() => {
    const subscription = integrationService.subscribe((snapshot) => {
      const state = snapshot.value as string
      const ctx = snapshot.context

      // Handle matching state — trigger episode match
      if (state === 'matching' && ctx.mediaInfo) {
        const mediaInfo = ctx.mediaInfo

        getTrackingService().track('integrationPolicyMediaChange', {
          mediaInfo: mediaInfo.toJSON(),
          policy: integrationPolicy,
        })

        if (activeConfig.mode === 'ai') {
          toast.success(
            t('integration.alert.AIResult', 'AI Parsing Result: {{title}}', {
              title: mediaInfo.toString(),
            })
          )
        }

        if (useStore.getState().danmaku.isMounted) {
          unmountDanmaku.mutate()
        }

        toast.info(
          t('integration.alert.search', 'Searching for anime: {{title}}', {
            title: mediaInfo.toString(),
          })
        )

        const episodeMatchPayload = {
          mapKey: mediaInfo.getKey(),
          title: mediaInfo.title,
          episodeNumber: mediaInfo.episode,
          originalTitle: mediaInfo.originalTitle,
        }

        matchEpisode.mutate(episodeMatchPayload, {
          onSuccess: (result) => {
            if (result.data.status === 'success') {
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
                    options: { forceUpdate: false },
                  },
                  {
                    onError: () => {
                      toast.error(
                        t(
                          'danmaku.alert.fetchError',
                          'Failed to fetch danmaku: {{message}}',
                          { message: episodeMatchPayload.title }
                        )
                      )
                    },
                  }
                )
              }
            }
          },
        })
      }

      // Handle error state
      if (state === 'error' && ctx.error) {
        getTrackingService().track('integrationPolicyError', {
          error: new Error(ctx.error),
        })
        toast.error(ctx.error)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [activeConfig, integrationPolicy])

  // Handle AI status toast
  useEffect(() => {
    const subscription = integrationService.subscribe((snapshot) => {
      // The observer emits statusChange internally
      // For the AI toast, we check machine state
      if (snapshot.value === 'observing' && activeConfig.mode === 'ai') {
        // AI toast is handled by the observer's statusChange event
        // which the service doesn't expose yet — keep using observer events for now
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [activeConfig])
}
