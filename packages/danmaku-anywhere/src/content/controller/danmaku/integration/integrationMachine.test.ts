import type { GenericEpisode } from '@danmaku-anywhere/danmaku-converter'
import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'
import { type IntegrationEvent, integrationMachine } from './integrationMachine'

function makeConfig(mode: MountConfig['mode']): MountConfig {
  return {
    mode,
    patterns: [],
    mediaQuery: 'video',
    enabled: true,
    name: 'test',
    ai: { providerId: 'test' },
  } as unknown as MountConfig
}

const mockPolicy = {} as IntegrationPolicy

const mockEpisodes = [
  { comments: [], commentCount: 0 },
] as unknown as GenericEpisode[]

/**
 * Helper: create actor, send events, return final state value
 */
function transition(events: IntegrationEvent[]) {
  const actor = createActor(integrationMachine)
  actor.start()
  for (const event of events) {
    actor.send(event)
  }
  const snapshot = actor.getSnapshot()
  actor.stop()
  return snapshot
}

function transitionValue(events: IntegrationEvent[]): string {
  return transition(events).value as string
}

describe('integrationMachine transitions', () => {
  describe('from idle', () => {
    it('starts in idle', () => {
      expect(transitionValue([])).toBe('idle')
    })

    it('CONFIG_CHANGED with xpath mode → waitingForVideo', () => {
      expect(
        transitionValue([
          {
            type: 'CONFIG_CHANGED',
            config: makeConfig('xpath'),
            policy: mockPolicy,
          },
        ])
      ).toBe('waitingForVideo')
    })

    it('CONFIG_CHANGED with ai mode → waitingForVideo', () => {
      expect(
        transitionValue([
          { type: 'CONFIG_CHANGED', config: makeConfig('ai'), policy: null },
        ])
      ).toBe('waitingForVideo')
    })

    it('CONFIG_CHANGED with manual mode → manual', () => {
      expect(
        transitionValue([
          {
            type: 'CONFIG_CHANGED',
            config: makeConfig('manual'),
            policy: null,
          },
        ])
      ).toBe('manual')
    })
  })

  describe('from waitingForVideo', () => {
    const configEvent: IntegrationEvent = {
      type: 'CONFIG_CHANGED',
      config: makeConfig('xpath'),
      policy: mockPolicy,
    }

    it('VIDEO_DETECTED → observing', () => {
      expect(transitionValue([configEvent, { type: 'VIDEO_DETECTED' }])).toBe(
        'observing'
      )
    })

    it('CONFIG_CHANGED with manual → manual', () => {
      expect(
        transitionValue([
          configEvent,
          {
            type: 'CONFIG_CHANGED',
            config: makeConfig('manual'),
            policy: null,
          },
        ])
      ).toBe('manual')
    })
  })

  describe('from observing', () => {
    const toObserving: IntegrationEvent[] = [
      {
        type: 'CONFIG_CHANGED',
        config: makeConfig('xpath'),
        policy: mockPolicy,
      },
      { type: 'VIDEO_DETECTED' },
    ]

    it('MEDIA_FOUND → matching', () => {
      const mediaInfo = new MediaInfo({ title: 'Test', episode: 1 })
      expect(
        transitionValue([...toObserving, { type: 'MEDIA_FOUND', mediaInfo }])
      ).toBe('matching')
    })

    it('VIDEO_REMOVED → waitingForVideo', () => {
      expect(transitionValue([...toObserving, { type: 'VIDEO_REMOVED' }])).toBe(
        'waitingForVideo'
      )
    })

    it('ERROR → error', () => {
      expect(
        transitionValue([...toObserving, { type: 'ERROR', message: 'fail' }])
      ).toBe('error')
    })

    it('stores mediaInfo in context on MEDIA_FOUND', () => {
      const mediaInfo = new MediaInfo({ title: 'Naruto', episode: 3 })
      const snapshot = transition([
        ...toObserving,
        { type: 'MEDIA_FOUND', mediaInfo },
      ])
      expect(snapshot.context.mediaInfo).toBe(mediaInfo)
    })
  })

  describe('from matching', () => {
    const toMatching: IntegrationEvent[] = [
      {
        type: 'CONFIG_CHANGED',
        config: makeConfig('xpath'),
        policy: mockPolicy,
      },
      { type: 'VIDEO_DETECTED' },
      {
        type: 'MEDIA_FOUND',
        mediaInfo: new MediaInfo({ title: 'Test', episode: 1 }),
      },
    ]

    it('MATCH_SUCCESS → fetching', () => {
      expect(
        transitionValue([
          ...toMatching,
          { type: 'MATCH_SUCCESS', episodes: mockEpisodes },
        ])
      ).toBe('fetching')
    })

    it('MATCH_NOT_FOUND → error', () => {
      expect(
        transitionValue([
          ...toMatching,
          { type: 'MATCH_NOT_FOUND', cause: 'not found' },
        ])
      ).toBe('error')
    })

    it('MATCH_DISAMBIGUATION stores seasons in context', () => {
      const seasons = [{ animeId: 1, animeTitle: 'Test' }] as any
      const snapshot = transition([
        ...toMatching,
        { type: 'MATCH_DISAMBIGUATION', seasons },
      ])
      expect(snapshot.context.disambiguationSeasons).toBe(seasons)
    })

    it('stores error message on MATCH_NOT_FOUND', () => {
      const snapshot = transition([
        ...toMatching,
        { type: 'MATCH_NOT_FOUND', cause: 'no results' },
      ])
      expect(snapshot.context.error).toBe('no results')
    })
  })

  describe('from fetching', () => {
    const toFetching: IntegrationEvent[] = [
      {
        type: 'CONFIG_CHANGED',
        config: makeConfig('xpath'),
        policy: mockPolicy,
      },
      { type: 'VIDEO_DETECTED' },
      {
        type: 'MEDIA_FOUND',
        mediaInfo: new MediaInfo({ title: 'Test', episode: 1 }),
      },
      { type: 'MATCH_SUCCESS', episodes: mockEpisodes },
    ]

    it('FETCH_SUCCESS → mounted', () => {
      expect(
        transitionValue([
          ...toFetching,
          { type: 'FETCH_SUCCESS', episodes: mockEpisodes },
        ])
      ).toBe('mounted')
    })

    it('ERROR → error', () => {
      expect(
        transitionValue([
          ...toFetching,
          { type: 'ERROR', message: 'fetch failed' },
        ])
      ).toBe('error')
    })

    it('stores episodes in context on FETCH_SUCCESS', () => {
      const snapshot = transition([
        ...toFetching,
        { type: 'FETCH_SUCCESS', episodes: mockEpisodes },
      ])
      expect(snapshot.context.episodes).toBe(mockEpisodes)
    })
  })

  describe('from mounted', () => {
    const toMounted: IntegrationEvent[] = [
      {
        type: 'CONFIG_CHANGED',
        config: makeConfig('xpath'),
        policy: mockPolicy,
      },
      { type: 'VIDEO_DETECTED' },
      {
        type: 'MEDIA_FOUND',
        mediaInfo: new MediaInfo({ title: 'Test', episode: 1 }),
      },
      { type: 'MATCH_SUCCESS', episodes: mockEpisodes },
      { type: 'FETCH_SUCCESS', episodes: mockEpisodes },
    ]

    it('UNMOUNT → observing', () => {
      expect(transitionValue([...toMounted, { type: 'UNMOUNT' }])).toBe(
        'observing'
      )
    })

    it('VIDEO_REMOVED → waitingForVideo', () => {
      expect(transitionValue([...toMounted, { type: 'VIDEO_REMOVED' }])).toBe(
        'waitingForVideo'
      )
    })

    it('CONFIG_CHANGED re-evaluates from idle', () => {
      expect(
        transitionValue([
          ...toMounted,
          {
            type: 'CONFIG_CHANGED',
            config: makeConfig('manual'),
            policy: null,
          },
        ])
      ).toBe('manual')
    })
  })

  describe('from error', () => {
    const toError: IntegrationEvent[] = [
      {
        type: 'CONFIG_CHANGED',
        config: makeConfig('xpath'),
        policy: mockPolicy,
      },
      { type: 'VIDEO_DETECTED' },
      { type: 'ERROR', message: 'something broke' },
    ]

    it('VIDEO_DETECTED → observing (retry)', () => {
      expect(transitionValue([...toError, { type: 'VIDEO_DETECTED' }])).toBe(
        'observing'
      )
    })

    it('CONFIG_CHANGED re-evaluates', () => {
      expect(
        transitionValue([
          ...toError,
          { type: 'CONFIG_CHANGED', config: makeConfig('ai'), policy: null },
        ])
      ).toBe('waitingForVideo')
    })

    it('stores error message in context', () => {
      const snapshot = transition(toError)
      expect(snapshot.context.error).toBe('something broke')
    })
  })

  describe('from manual', () => {
    const toManual: IntegrationEvent[] = [
      { type: 'CONFIG_CHANGED', config: makeConfig('manual'), policy: null },
    ]

    it('MANUAL_MOUNT → mounted', () => {
      expect(
        transitionValue([
          ...toManual,
          { type: 'MANUAL_MOUNT', episodes: mockEpisodes },
        ])
      ).toBe('mounted')
    })

    it('CONFIG_CHANGED with xpath → waitingForVideo', () => {
      expect(
        transitionValue([
          ...toManual,
          {
            type: 'CONFIG_CHANGED',
            config: makeConfig('xpath'),
            policy: mockPolicy,
          },
        ])
      ).toBe('waitingForVideo')
    })

    it('stores episodes in context on MANUAL_MOUNT', () => {
      const snapshot = transition([
        ...toManual,
        { type: 'MANUAL_MOUNT', episodes: mockEpisodes },
      ])
      expect(snapshot.context.episodes).toBe(mockEpisodes)
    })
  })

  describe('context management', () => {
    it('CONFIG_CHANGED stores config and policy', () => {
      const config = makeConfig('xpath')
      const snapshot = transition([
        { type: 'CONFIG_CHANGED', config, policy: mockPolicy },
      ])
      expect(snapshot.context.config).toBe(config)
      expect(snapshot.context.policy).toBe(mockPolicy)
    })

    it('CONFIG_CHANGED clears previous error', () => {
      const snapshot = transition([
        {
          type: 'CONFIG_CHANGED',
          config: makeConfig('xpath'),
          policy: mockPolicy,
        },
        { type: 'VIDEO_DETECTED' },
        { type: 'ERROR', message: 'fail' },
        {
          type: 'CONFIG_CHANGED',
          config: makeConfig('xpath'),
          policy: mockPolicy,
        },
      ])
      expect(snapshot.context.error).toBeNull()
    })
  })
})
