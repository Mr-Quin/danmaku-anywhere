import { PlexObserver } from './Plex'

export const observersMap: Record<string, typeof PlexObserver> = {
  plex: PlexObserver,
}
