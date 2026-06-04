import { describe, expect, it } from 'vitest'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { type PanelStateInputs, selectPanelState } from './selectPanelState'

/**
 * Exercises the pure derivation of the info-panel snapshot from controller
 * store inputs. Verifies the priority of disconnected > error > mounted >
 * matched > loading > noMatch and the media payload shape.
 */
describe('selectPanelState', () => {
  const baseInputs: PanelStateInputs = {
    enabled: true,
    isDisconnected: false,
    isManual: false,
    isMounted: false,
    commentCount: 0,
    integration: {
      active: false,
    },
  }

  it('reports disconnected when the controller is disconnected', () => {
    const snapshot = selectPanelState({
      ...baseInputs,
      isDisconnected: true,
      isMounted: true,
      integration: {
        ...baseInputs.integration,
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(snapshot.state).toBe('disconnected')
  })

  it('reports error before mounted or matched when an errorMessage is set', () => {
    const snapshot = selectPanelState({
      ...baseInputs,
      isMounted: true,
      integration: {
        ...baseInputs.integration,
        errorMessage: 'boom',
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(snapshot.state).toBe('error')
  })

  it('reports mounted when danmaku is mounted', () => {
    const snapshot = selectPanelState({
      ...baseInputs,
      isMounted: true,
      commentCount: 42,
      integration: {
        ...baseInputs.integration,
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(snapshot.state).toBe('mounted')
    expect(snapshot.commentCount).toBe(42)
  })

  it('reports matched when mediaInfo is set but danmaku is not mounted yet', () => {
    const snapshot = selectPanelState({
      ...baseInputs,
      integration: {
        ...baseInputs.integration,
        active: true,
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(snapshot.state).toBe('matched')
    expect(snapshot.commentCount).toBeUndefined()
  })

  it('reports loading while the integration is active without a match', () => {
    const snapshot = selectPanelState({
      ...baseInputs,
      integration: {
        ...baseInputs.integration,
        active: true,
      },
    })
    expect(snapshot.state).toBe('loading')
  })

  it('reports noMatch when the integration is inactive with no match', () => {
    expect(selectPanelState(baseInputs).state).toBe('noMatch')
  })

  it('forwards media fields and provider', () => {
    const media = new MediaInfo({
      title: 'Show',
      episode: 3,
      seasonDecorator: '2',
      episodeTitle: 'Pilot',
      originalTitle: 'Original',
    })
    const snapshot = selectPanelState({
      ...baseInputs,
      provider: 'dandanplay',
      integration: {
        ...baseInputs.integration,
        mediaInfo: media,
      },
    })
    expect(snapshot.media).toEqual({
      title: 'Show',
      episode: 3,
      seasonDecorator: '2',
      episodeTitle: 'Pilot',
      originalTitle: 'Original',
    })
    expect(snapshot.provider).toBe('dandanplay')
  })

  it('derives media from the mounted episode in manual mode', () => {
    const snapshot = selectPanelState({
      ...baseInputs,
      isManual: true,
      isMounted: true,
      commentCount: 7,
      mountedEpisodes: [
        {
          provider: DanmakuSourceType.Bilibili,
          title: 'Episode Title',
          episodeNumber: 5,
          indexedId: 'e5',
          seasonId: 1,
          providerIds: {},
          comments: [],
          commentCount: 7,
          schemaVersion: 4,
          lastChecked: 0,
          id: 1,
          season: {
            title: 'Manual Show',
            type: 'tv',
            provider: DanmakuSourceType.Bilibili,
            providerIds: {},
            providerConfigId: 'c1',
            indexedId: 's1',
            schemaVersion: 1,
            id: 1,
          },
        },
      ] as unknown as PanelStateInputs['mountedEpisodes'],
    })
    expect(snapshot.state).toBe('mounted')
    expect(snapshot.isManual).toBe(true)
    expect(snapshot.media).toEqual({
      title: 'Manual Show',
      episode: 5,
      episodeTitle: 'Episode Title',
    })
    expect(snapshot.commentCount).toBe(7)
  })

  it('prefers integration mediaInfo over mounted episodes when both exist', () => {
    const snapshot = selectPanelState({
      ...baseInputs,
      isMounted: true,
      mountedEpisodes: [
        { provider: DanmakuSourceType.MacCMS, title: 'ignored' },
      ] as unknown as PanelStateInputs['mountedEpisodes'],
      integration: {
        ...baseInputs.integration,
        mediaInfo: new MediaInfo({ title: 'Matched', episode: 1 }),
      },
    })
    expect(snapshot.media?.title).toBe('Matched')
  })
})
