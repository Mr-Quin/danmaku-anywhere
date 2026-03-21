import type {
  GenericEpisode,
  Season,
} from '@danmaku-anywhere/danmaku-converter'
import { assign, setup } from 'xstate'
import type { IntegrationPolicy } from '@/common/options/integrationPolicyStore/schema'
import type { MountConfig } from '@/common/options/mountConfig/schema'
import type { MediaInfo } from '@/content/controller/danmaku/integration/models/MediaInfo'

export type IntegrationEvent =
  | {
      type: 'CONFIG_CHANGED'
      config: MountConfig
      policy: IntegrationPolicy | null
    }
  | { type: 'VIDEO_DETECTED' }
  | { type: 'VIDEO_REMOVED' }
  | { type: 'MEDIA_FOUND'; mediaInfo: MediaInfo }
  | { type: 'MATCH_SUCCESS'; episodes: GenericEpisode[] }
  | { type: 'MATCH_DISAMBIGUATION'; seasons: Season[] }
  | { type: 'MATCH_NOT_FOUND'; cause: string }
  | { type: 'FETCH_SUCCESS'; episodes: GenericEpisode[] }
  | { type: 'MOUNT_SUCCESS' }
  | { type: 'ERROR'; message: string }
  | { type: 'MANUAL_MOUNT'; episodes: GenericEpisode[] }
  | { type: 'UNMOUNT' }

export interface IntegrationContext {
  config: MountConfig | null
  policy: IntegrationPolicy | null
  mediaInfo: MediaInfo | null
  error: string | null
  episodes: GenericEpisode[] | null
  disambiguationSeasons: Season[] | null
}

const initialContext: IntegrationContext = {
  config: null,
  policy: null,
  mediaInfo: null,
  error: null,
  episodes: null,
  disambiguationSeasons: null,
}

export const integrationMachine = setup({
  types: {
    context: {} as IntegrationContext,
    events: {} as IntegrationEvent,
  },
  guards: {
    isManualMode: ({ event }) => {
      if (event.type !== 'CONFIG_CHANGED') {
        return false
      }
      return event.config.mode === 'manual'
    },
  },
  actions: {
    storeConfig: assign({
      config: ({ event }) => {
        if (event.type !== 'CONFIG_CHANGED') {
          return null
        }
        return event.config
      },
      policy: ({ event }) => {
        if (event.type !== 'CONFIG_CHANGED') {
          return null
        }
        return event.policy
      },
      error: () => null,
      mediaInfo: () => null,
      episodes: () => null,
      disambiguationSeasons: () => null,
    }),
    storeMediaInfo: assign({
      mediaInfo: ({ event }) => {
        if (event.type !== 'MEDIA_FOUND') {
          return null
        }
        return event.mediaInfo
      },
    }),
    storeError: assign({
      error: ({ event }) => {
        if (event.type === 'ERROR') {
          return event.message
        }
        if (event.type === 'MATCH_NOT_FOUND') {
          return event.cause
        }
        return null
      },
    }),
    storeEpisodes: assign({
      episodes: ({ event }) => {
        if (
          event.type === 'MATCH_SUCCESS' ||
          event.type === 'FETCH_SUCCESS' ||
          event.type === 'MANUAL_MOUNT'
        ) {
          return event.episodes
        }
        return null
      },
    }),
    storeDisambiguation: assign({
      disambiguationSeasons: ({ event }) => {
        if (event.type !== 'MATCH_DISAMBIGUATION') {
          return null
        }
        return event.seasons
      },
    }),
    clearError: assign({ error: () => null }),
  },
}).createMachine({
  id: 'integration',
  initial: 'idle',
  context: initialContext,
  on: {
    CONFIG_CHANGED: [
      {
        guard: 'isManualMode',
        target: '.manual',
        actions: 'storeConfig',
      },
      {
        target: '.waitingForVideo',
        actions: 'storeConfig',
      },
    ],
  },
  states: {
    idle: {},
    waitingForVideo: {
      on: {
        VIDEO_DETECTED: {
          target: 'observing',
        },
      },
    },
    observing: {
      on: {
        MEDIA_FOUND: {
          target: 'matching',
          actions: 'storeMediaInfo',
        },
        VIDEO_REMOVED: {
          target: 'waitingForVideo',
        },
        ERROR: {
          target: 'error',
          actions: 'storeError',
        },
      },
    },
    matching: {
      on: {
        MATCH_SUCCESS: {
          target: 'fetching',
          actions: 'storeEpisodes',
        },
        MATCH_NOT_FOUND: {
          target: 'error',
          actions: 'storeError',
        },
        MATCH_DISAMBIGUATION: {
          actions: 'storeDisambiguation',
        },
        ERROR: {
          target: 'error',
          actions: 'storeError',
        },
      },
    },
    fetching: {
      on: {
        FETCH_SUCCESS: {
          target: 'mounted',
          actions: 'storeEpisodes',
        },
        ERROR: {
          target: 'error',
          actions: 'storeError',
        },
      },
    },
    mounted: {
      on: {
        UNMOUNT: {
          target: 'observing',
        },
        VIDEO_REMOVED: {
          target: 'waitingForVideo',
        },
      },
    },
    error: {
      on: {
        VIDEO_DETECTED: {
          target: 'observing',
          actions: 'clearError',
        },
      },
    },
    manual: {
      on: {
        MANUAL_MOUNT: {
          target: 'mounted',
          actions: 'storeEpisodes',
        },
      },
    },
  },
})
