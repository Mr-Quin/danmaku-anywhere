import type {
  CustomEpisode,
  GenericEpisode,
} from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { episodeToPanelMedia } from './episodeToPanelMedia'

function remoteEpisode(over: Partial<GenericEpisode> = {}): GenericEpisode {
  return {
    provider: DanmakuSourceType.Bilibili,
    title: '迷星叫',
    episodeNumber: 11,
    indexedId: 'ep-11',
    seasonId: 1,
    providerIds: {},
    comments: [],
    commentCount: 0,
    schemaVersion: 4,
    lastChecked: 0,
    id: 1,
    season: {
      title: 'MyGO!!!!!',
      type: 'tv',
      provider: DanmakuSourceType.Bilibili,
      providerIds: {},
      providerConfigId: 'c1',
      indexedId: 's-1',
      schemaVersion: 1,
      id: 1,
    },
    ...over,
  } as unknown as GenericEpisode
}

function customEpisode(): CustomEpisode {
  return {
    provider: DanmakuSourceType.MacCMS,
    title: 'My local file.xml',
    comments: [],
    commentCount: 0,
    schemaVersion: 4,
    id: 2,
  } as unknown as CustomEpisode
}

describe('episodeToPanelMedia', () => {
  it('maps a remote episode to season title + episode number + episode title', () => {
    const media = episodeToPanelMedia(remoteEpisode())
    expect(media).toEqual({
      title: 'MyGO!!!!!',
      episode: 11,
      episodeTitle: '迷星叫',
    })
  })

  it('preserves a string episode number', () => {
    const media = episodeToPanelMedia(remoteEpisode({ episodeNumber: 'OVA' }))
    expect(media.episode).toBe('OVA')
  })

  it('maps a custom episode to its title only', () => {
    const media = episodeToPanelMedia(customEpisode())
    expect(media).toEqual({ title: 'My local file.xml' })
  })
})
