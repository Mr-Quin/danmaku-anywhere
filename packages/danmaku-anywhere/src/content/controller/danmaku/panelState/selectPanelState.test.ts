import { describe, expect, it } from 'vitest'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { PipelineEntry } from '@/common/rpcClient/background/types'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { type PanelStateInputs, selectPanelState } from './selectPanelState'

/**
 * Exercises the pure derivation of the pipeline panel entry. Covers the null
 * gate (manual mode before a successful mount), the substate priority
 * (disconnected > error > mounted > matched > loading > noMatch), and the
 * payload shape. The infoPanel.enabled gate lives in the player, not here.
 */
const base: PanelStateInputs = {
  isDisconnected: false,
  isManual: false,
  isMounted: false,
  commentCount: 0,
  integration: {
    active: false,
  },
}

function assertEntry(inputs: PanelStateInputs): PipelineEntry {
  const result = selectPanelState(inputs)
  expect(result).not.toBeNull()
  return result as PipelineEntry
}

describe('selectPanelState — null gate (display policy)', () => {
  it('returns null in manual mode when substate is loading', () => {
    expect(
      selectPanelState({
        ...base,
        isManual: true,
        integration: { active: true },
      })
    ).toBeNull()
  })

  it('returns null in manual mode when substate is matched', () => {
    expect(
      selectPanelState({
        ...base,
        isManual: true,
        integration: {
          active: true,
          mediaInfo: new MediaInfo({ title: 'X', episode: 1 }),
        },
      })
    ).toBeNull()
  })

  it('returns null in manual mode when substate is noMatch', () => {
    expect(selectPanelState({ ...base, isManual: true })).toBeNull()
  })

  it('returns null in manual mode when substate is error', () => {
    expect(
      selectPanelState({
        ...base,
        isManual: true,
        integration: { active: false, errorMessage: 'boom' },
      })
    ).toBeNull()
  })

  it('returns null in manual mode when substate is disconnected', () => {
    // Intentional: manual mode only surfaces mounted state to avoid noise.
    expect(
      selectPanelState({ ...base, isManual: true, isDisconnected: true })
    ).toBeNull()
  })

  it('returns a PipelineEntry in manual mode when substate is mounted', () => {
    const result = selectPanelState({
      ...base,
      isManual: true,
      isMounted: true,
      commentCount: 5,
    })
    expect(result).not.toBeNull()
    expect((result as PipelineEntry).substate).toBe('mounted')
  })
})

describe('selectPanelState — substate priority', () => {
  it('reports disconnected above all other conditions', () => {
    const entry = assertEntry({
      ...base,
      isDisconnected: true,
      isMounted: true,
      integration: {
        active: true,
        mediaInfo: new MediaInfo({ title: 'X', episode: 1 }),
        errorMessage: 'boom',
      },
    })
    expect(entry.substate).toBe('disconnected')
  })

  it('reports error before mounted or matched', () => {
    const entry = assertEntry({
      ...base,
      isMounted: true,
      integration: {
        active: true,
        mediaInfo: new MediaInfo({ title: 'X', episode: 1 }),
        errorMessage: 'something failed',
      },
    })
    expect(entry.substate).toBe('error')
  })

  it('reports mounted when isMounted is true and no error or disconnect', () => {
    const entry = assertEntry({
      ...base,
      isMounted: true,
      commentCount: 99,
      integration: {
        active: true,
        mediaInfo: new MediaInfo({ title: 'X', episode: 1 }),
      },
    })
    expect(entry.substate).toBe('mounted')
    expect(entry.commentCount).toBe(99)
  })

  it('reports matched when mediaInfo is set but not yet mounted', () => {
    const entry = assertEntry({
      ...base,
      integration: {
        active: true,
        mediaInfo: new MediaInfo({ title: 'X', episode: 1 }),
      },
    })
    expect(entry.substate).toBe('matched')
    expect(entry.commentCount).toBeUndefined()
  })

  it('reports loading when the integration is active with no match', () => {
    const entry = assertEntry({ ...base, integration: { active: true } })
    expect(entry.substate).toBe('loading')
  })

  it('reports noMatch when the integration is inactive with no match', () => {
    const entry = assertEntry(base)
    expect(entry.substate).toBe('noMatch')
  })
})

describe('selectPanelState — payload shape', () => {
  it('returns a PipelineEntry with source pipeline', () => {
    const entry = assertEntry({ ...base, integration: { active: true } })
    expect(entry.source).toBe('pipeline')
  })

  it('includes media when mediaInfo is set', () => {
    const entry = assertEntry({
      ...base,
      integration: {
        active: true,
        mediaInfo: new MediaInfo({
          title: 'Show',
          episode: 3,
          seasonDecorator: '2',
          episodeTitle: 'Pilot',
        }),
      },
    })
    expect(entry.media).toMatchObject({
      title: 'Show',
      episode: 3,
      seasonDecorator: '2',
      episodeTitle: 'Pilot',
    })
  })

  it('omits commentCount for non-mounted states', () => {
    const entry = assertEntry({
      ...base,
      commentCount: 42,
      integration: {
        active: true,
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(entry.substate).toBe('matched')
    expect(entry.commentCount).toBeUndefined()
  })

  it('includes commentCount only when mounted', () => {
    const entry = assertEntry({ ...base, isMounted: true, commentCount: 7 })
    expect(entry.commentCount).toBe(7)
  })

  it('includes provider when set', () => {
    const entry = assertEntry({
      ...base,
      provider: DanmakuSourceType.DanDanPlay,
      integration: {
        active: true,
        mediaInfo: new MediaInfo({ title: 'Show', episode: 1 }),
      },
    })
    expect(entry.provider).toBe(DanmakuSourceType.DanDanPlay)
  })

  it('derives media from the mounted episode in manual mode', () => {
    const entry = selectPanelState({
      ...base,
      isManual: true,
      isMounted: true,
      commentCount: 3,
      mountedEpisodes: [
        {
          provider: DanmakuSourceType.Bilibili,
          title: 'Episode Title',
          episodeNumber: 2,
          indexedId: 'e2',
          seasonId: 1,
          providerIds: {},
          comments: [],
          commentCount: 3,
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
    expect(entry).not.toBeNull()
    expect((entry as PipelineEntry).media).toMatchObject({
      title: 'Manual Show',
      episode: 2,
      episodeTitle: 'Episode Title',
    })
    expect((entry as PipelineEntry).commentCount).toBe(3)
  })

  it('prefers integration mediaInfo over mounted episodes', () => {
    const entry = assertEntry({
      ...base,
      isMounted: true,
      mountedEpisodes: [
        { provider: DanmakuSourceType.MacCMS, title: 'should be ignored' },
      ] as unknown as PanelStateInputs['mountedEpisodes'],
      integration: {
        active: true,
        mediaInfo: new MediaInfo({ title: 'Integration Match', episode: 1 }),
      },
    })
    expect(entry.media?.title).toBe('Integration Match')
  })
})
