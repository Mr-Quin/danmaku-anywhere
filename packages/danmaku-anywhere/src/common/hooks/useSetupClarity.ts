import { clarity } from 'clarity-js'
import { useEffect, useRef } from 'react'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const useSetupClarity = (projectId: string) => {
  const { data } = useExtensionOptions()

  const clarityStarted = useRef(false)

  useEffect(() => {
    if (data.enableAnalytics && !clarityStarted.current) {
      clarity.start({
        projectId,
        upload: 'https://m.clarity.ms/collect',
        track: true,
        content: true,
      })
      if (data.id) {
        clarity.identify(data.id)
      }
      clarityStarted.current = true
    } else if (clarityStarted.current) {
      clarity.stop()
      clarityStarted.current = false
    }
  }, [data.enableAnalytics, data.id])
}
