import { describe, expect, it } from 'vitest'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { type PanelStateInputs, selectPanelState } from './selectPanelState'

/**
 * Exercises the pure derivation of the pipeline panel entry from controller
 * store inputs. Verifies the substate priority (disconnected > error > mounted >
 * matched > loading > noMatch), the media payload shape, and the visibility
 * policy (disabled and manual-before-mount both yield null, i.e. no entry).
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

  it('returns null when the info panel is disabled', () => {
    expect(selectPanelState({ ...baseInputs, enabled: false })).toBeNull()
  })

  it('returns null in manual mode until danmaku is mounted', () => {
    expect(
      selectPanelState({
        ...baseInputs,
        isManual: true,
        integration: { ...baseInputs.integration, active: true },
      })
    ).toBeNull()
  })

  it('reports disconnected when the controller is disconnected', () => {
    const entry = selectPanelState({
      ...baseInputs,
      isDisconnected: true,
      isMounted: true,
      integration: {
        ...baseInputs.integration,
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(entry?.substate).toBe('disconnected')
  })

  it('reports error before mounted or matched when an errorMessage is set', () => {
    const entry = selectPanelState({
      ...baseInputs,
      isMounted: true,
      integration: {
        ...baseInputs.integration,
        errorMessage: 'boom',
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(entry?.substate).toBe('error')
  })

  it('reports mounted when danmaku is mounted', () => {
    const entry = selectPanelState({
      ...baseInputs,
      isMounted: true,
      commentCount: 42,
      integration: {
        ...baseInputs.integration,
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(entry?.substate).toBe('mounted')
    expect(entry?.commentCount).toBe(42)
  })

  it('reports matched when mediaInfo is set but danmaku is not mounted yet', () => {
    const entry = selectPanelState({
      ...baseInputs,
      integration: {
        ...baseInputs.integration,
        active: true,
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(entry?.substate).toBe('matched')
    expect(entry?.commentCount).toBeUndefined()
  })

  it('reports loading while the integration is active without a match', () => {
    const entry = selectPanelState({
      ...baseInputs,
      integration: {
        ...baseInputs.integration,
        active: true,
      },
    })
    expect(entry?.substate).toBe('loading')
  })

  it('reports noMatch when the integration is inactive with no match', () => {
    expect(selectPanelState(baseInputs)?.substate).toBe('noMatch')
  })

  it('forwards media fields and provider', () => {
    const media = new MediaInfo({
      title: 'Show',
      episode: 3,
      seasonDecorator: '2',
      episodeTitle: 'Pilot',
      originalTitle: 'Original',
    })
    const entry = selectPanelState({
      ...baseInputs,
      provider: DanmakuSourceType.DanDanPlay,
      integration: {
        ...baseInputs.integration,
        mediaInfo: media,
      },
    })
    expect(entry?.media).toEqual({
      title: 'Show',
      episode: 3,
      seasonDecorator: '2',
      episodeTitle: 'Pilot',
      originalTitle: 'Original',
    })
    expect(entry?.provider).toBe(DanmakuSourceType.DanDanPlay)
  })

  it('derives media from the mounted episode in manual mode', () => {
    const entry = selectPanelState({
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
    expect(entry?.substate).toBe('mounted')
    expect(entry?.media).toEqual({
      title: 'Manual Show',
      episode: 5,
      episodeTitle: 'Episode Title',
    })
    expect(entry?.commentCount).toBe(7)
  })

  it('prefers integration mediaInfo over mounted episodes when both exist', () => {
    const entry = selectPanelState({
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
    expect(entry?.media?.title).toBe('Matched')
  })
})
