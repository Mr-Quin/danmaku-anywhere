import { useEffect } from 'preact/hooks'
import { logger } from '@/utils/logger'

export const useCreatePlexPortal = () => {
  // Create a portal for the danmaku panel
  useEffect(() => {
    logger.debug('Creating danmaku portal root')
    const prevPortal = document.getElementById('danmaku-portal')
    // probably not necessary, but just in case
    if (prevPortal) {
      prevPortal.remove()
    }
    const portal = document.createElement('div')
    portal.id = 'danmaku-portal'
    document.body.prepend(portal)
  }, [])
}
