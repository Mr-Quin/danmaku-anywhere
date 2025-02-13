import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
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
  const { setMediaInfo, setErrorMessage, setActive, setFoundElements } =
    useStore.use.integration()

  const matchEpisode = useMatchEpisode()
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
    if (!integrationPolicy || isManual) {
      observer.current = undefined
      return
    }

    // Only create the observer if the video node is present
    if (!videoId) {
      observer.current?.reset()
      return
    }

    const obs = new IntegrationPolicyObserver(integrationPolicy.policy)
    observer.current = obs
    setActive(true)
    obs.on({
      mediaChange: async (state: MediaInfo) => {
        if (integrationPolicy.policy.options.useAI) {
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
          mapKey: state.key(),
          title: state.title,
          episodeNumber: state.episode,
        }

        toast.info(t('integration.alert.search', { title: state.toString() }))
        matchEpisode.mutate(episodeMatchPayload)
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
    obs.setup()

    return () => {
      obs.destroy()
      observer.current = undefined
      setActive(false)
    }
  }, [integrationPolicy, isManual, videoId])
}
