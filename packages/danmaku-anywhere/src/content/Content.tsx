import { useDanmakuManager } from './useDanmakuManager'
import { usePlexTitle } from './integration/plex/usePlexTitle'
import { Toast } from './Toast'

export const Content = () => {
  useDanmakuManager()
  usePlexTitle()

  return <Toast />
}
