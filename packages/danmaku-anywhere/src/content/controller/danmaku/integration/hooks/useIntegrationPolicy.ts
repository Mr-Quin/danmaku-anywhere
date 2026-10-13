import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { isConfigPermissive } from '@/common/options/mountConfig/isPermissive'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { useUnmountDanmaku } from '@/content/controller/common/hooks/useUnmountDanmaku'
import {
  type EpisodeOperation,
  EpisodeToast,
  toastStoreSink,
} from '@/content/controller/danmaku/integration/episodeToast'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import type { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { ObserverFactory } from '@/content/controller/danmaku/integration/observers/ObserverFactory'
import { useStore } from '@/content/controller/store/store'
import { useFindEpisodeDanmaku } from './useFindEpisodeDanmaku'
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

  const [episodeToast] = useState(() => new EpisodeToast(toastStoreSink))
  const findDanmaku = useFindEpisodeDanmaku()

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

    let parsing: EpisodeOperation | undefined

    newObserver.on({
      statusChange: (status: string) => {
        if (status === 'Extracting video info using AI...') {
          parsing = episodeToast.start(
            t('integration.alert.usingAI', 'Using AI to parse show information')
          )
          return
        }
        // Parsing is over. If it found a show, the match already owns the toast.
        parsing?.cancel()
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

        const operation = episodeToast.start(
          t('integration.alert.finding', 'Finding danmaku for {{name}}…', {
            name: state.toString(),
          })
        )
        void findDanmaku(state, operation)
      },
      mediaElementsChange: () => {
        setFoundElements(true)
      },
      error: (error: Error) => {
        getTrackingService().track('integrationPolicyError', { error })
        episodeToast.start().fail(error.message)
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
