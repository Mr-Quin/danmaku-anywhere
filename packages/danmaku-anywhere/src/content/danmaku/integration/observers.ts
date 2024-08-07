import { PlexObserver } from './Plex'

import { IntegrationType } from '@/common/danmaku/enums'

export const observersMap: Record<string, typeof PlexObserver> = {
  [IntegrationType.Plex]: PlexObserver,
}
