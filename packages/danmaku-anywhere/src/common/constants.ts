export interface MountConfig {
  patterns: string[]
  mediaQuery: string
  containerQuery: string
  predefined: boolean
  enabled: boolean
  id: number
}

export interface MountConfigWithoutId extends Omit<MountConfig, 'id'> {
  id?: number
}

export const blankMountConfig = (url: string): MountConfigWithoutId => {
  return {
    patterns: [url],
    mediaQuery: '',
    containerQuery: '',
    predefined: false,
    enabled: true,
  }
}

export const defaultMountConfig: MountConfig[] = [
  {
    patterns: ['https://app.plex.tv', 'https://plex.intranet.quin.fish'],
    mediaQuery: 'video',
    containerQuery: '.Player-fullPlayerContainer-wBDz23',
    predefined: true,
    enabled: true,
    id: 0,
  },
  {
    patterns: ['https://www.bilibili.com'],
    mediaQuery: 'video',
    containerQuery: '.bpx-player-row-dm-wrap',
    predefined: true,
    enabled: true,
    id: 1,
  },
  {
    patterns: ['https://www.youtube.com'],
    mediaQuery: 'video',
    containerQuery: '#movie_player',
    predefined: true,
    enabled: true,
    id: 2,
  },
  {
    // crunchyroll video is in an iframe, so we need to use match the iframe's src
    patterns: ['https://www.crunchyroll.com', 'https://static.crunchyroll.com'],
    mediaQuery: '#player0',
    containerQuery: '#vilosRoot',
    predefined: true,
    enabled: true,
    id: 3,
  },
]
