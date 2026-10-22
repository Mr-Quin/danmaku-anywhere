import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { isConfigPermissive } from '@/common/options/mountConfig/isPermissive'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { unmountQuietly } from '@/content/controller/common/danmakuCommands'
import {
  type EpisodeRun,
  EpisodeRuns,
} from '@/content/controller/danmaku/integration/episodeRuns'
import { EpisodeToast } from '@/content/controller/danmaku/integration/episodeToast'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import type { MediaObserver } from '@/content/controller/danmaku/integration/observers/MediaObserver'
import { ObserverFactory } from '@/content/controller/danmaku/integration/observers/ObserverFactory'
import { onPreemptAutomatic } from '@/content/controller/store/automaticPreemption'
import { usePopup } from '@/content/controller/store/popupStore'
import { useStore } from '@/content/controller/store/store'
import { useEpisodeMatching } from './useEpisodeMatching'
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
  const {
    setMediaInfo,
    setErrorMessage,
    activate,
    deactivate,
    setFoundElements,
    resetIntegration,
  } = useStore.use.integration()

  const [runs] = useState(() => new EpisodeRuns())
  const [episodeToast] = useState(() => new EpisodeToast())
  const matchEpisode = useEpisodeMatching(episodeToast)

  const integrationPolicy = useActiveIntegration()
  const activeConfig = useActiveConfig()

  const isManual = useSyncIntegrationManualMode()
  const isConfigIncomplete = useWarnIncompleteConfig()

  useEffect(() => {
    const unfollow = episodeToast.follow(runs)
    const unpreempt = onPreemptAutomatic(() => {
      runs.end()
    })
    return () => {
      unfollow()
      unpreempt()
    }
  }, [runs, episodeToast])

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

    let parsingRun: EpisodeRun | undefined

    newObserver.on({
      parsingChange: (parsing: boolean) => {
        if (parsing) {
          parsingRun = runs.begin()
          episodeToast.progress(
            parsingRun,
            t('integration.alert.usingAI', 'Using AI to parse show information')
          )
          return
        }
        if (parsingRun?.isCurrent()) {
          runs.end()
        }
        parsingRun = undefined
      },
      mediaChange: (state: MediaInfo) => {
        // A parse the user overrode by picking or removing danmaku ended with
        // its run, and its result must not replace what they chose.
        if (parsingRun && !parsingRun.isCurrent()) {
          parsingRun = undefined
          return
        }
        parsingRun = undefined
        getTrackingService().track('integrationPolicyMediaChange', {
          mediaInfo: state.toJSON(),
          policy: integrationPolicy,
        })
        const run = runs.begin()
        if (useStore.getState().danmaku.isMounted) {
          void unmountQuietly()
        }

        // Another episode of the same show keeps whatever the user searched.
        if (
          useStore.getState().integration.mediaInfo?.getKey() !== state.getKey()
        ) {
          usePopup.getState().setSearchTitle(state.title)
        }
        setMediaInfo(state)
        setErrorMessage()

        void matchEpisode(run, state)
      },
      mediaElementsChange: () => {
        setFoundElements(true)
      },
      mediaCleared: () => {
        runs.end()
      },
      error: (error: Error) => {
        getTrackingService().track('integrationPolicyError', { error })
        if (parsingRun && !parsingRun.isCurrent()) {
          parsingRun = undefined
          return
        }
        // The error does not invalidate work in flight: if the page recovers
        // to the same media, that run is still the right one.
        const run = runs.current() ?? runs.begin()
        episodeToast.report(run, 'error', error.message)
        setErrorMessage(error.message)
      },
    })

    newObserver.setup()
    setObserver(newObserver)

    return () => {
      runs.end()
      newObserver.destroy()
      setObserver(null)
    }
  }, [activeConfig, integrationPolicy, isManual, isConfigIncomplete])

  useEffect(() => {
    if (!observer) {
      return
    }
    // Whatever the integration was doing belonged to the previous video.
    runs.end()
    if (activeFrameVideoKey !== undefined) {
      observer.run()
    } else {
      observer.reset()
      resetIntegration()
    }
  }, [activeFrameVideoKey, observer])
}
