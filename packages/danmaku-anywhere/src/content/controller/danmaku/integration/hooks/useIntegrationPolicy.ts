import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useToast } from '@/common/components/Toast/toastStore'
import { Logger } from '@/common/Logger'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useMatchEpisode } from '@/content/controller/danmaku/integration/hooks/useMatchEpisode'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { IntegrationPolicyObserver } from '@/content/controller/danmaku/integration/observers/IntegrationPolicyObserver'
import { useStore } from '@/content/controller/store/store'

export const useIntegrationPolicy = () => {
  const { t } = useTranslation()

  const { toast } = useToast()

  const observer = useRef<IntegrationPolicyObserver>(undefined)

  const { resetMediaState, toggleManualMode, manual, hasVideo } = useStore(
    useShallow((state) => state)
  )

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
    if (!integrationPolicy || manual) {
      observer.current = undefined
      return
    }

    // Only create the observer if the video node is present
    if (!hasVideo) {
      observer.current?.reset()
      return
    }

    const obs = new IntegrationPolicyObserver(integrationPolicy.policy)
    observer.current = obs
    setActive(true)
    obs.on({
      mediaChange: async (state: MediaInfo) => {
        resetMediaState()
        setMediaInfo(state)
        setErrorMessage()

        const episodeMatchPayload = {
          mapKey: state.key(),
          title: state.title,
          episodeNumber: state.episodic ? state.episode : undefined,
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

    obs.setup()

    return () => {
      obs.destroy()
      observer.current = undefined
      setActive(false)
    }
  }, [integrationPolicy, manual, hasVideo])
}
