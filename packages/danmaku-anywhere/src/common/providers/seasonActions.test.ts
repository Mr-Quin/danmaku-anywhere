import { describe, expect, it } from 'vitest'
import { seasonActions } from './seasonActions'
import { capabilitiesFromManifest } from './sourceCapabilities'

/**
 * seasonActions is the one answer the season menu and the season card read:
 * each action follows the source capability it needs, and a removed or
 * unavailable source keeps its actions visible but disabled.
 */

const pipeline = {}

describe('seasonActions', () => {
  it('enables what the source can do and hides what it cannot', () => {
    const actions = seasonActions({
      status: 'available',
      capabilities: capabilitiesFromManifest({
        search: pipeline,
        episodes: pipeline,
        danmaku: pipeline,
      }),
    })

    expect(actions).toEqual({
      refreshMetadata: { state: 'hidden' },
      follow: { state: 'enabled' },
      refreshEpisodes: { state: 'enabled' },
    })
  })

  it('offers Refresh Metadata for a manifest with a season pipeline', () => {
    const actions = seasonActions({
      status: 'available',
      capabilities: capabilitiesFromManifest({ season: pipeline }),
    })

    expect(actions.refreshMetadata).toEqual({ state: 'enabled' })
  })

  it('disables every action of a removed source', () => {
    expect(seasonActions({ status: 'removed' })).toEqual({
      refreshMetadata: { state: 'disabled', because: 'sourceRemoved' },
      follow: { state: 'disabled', because: 'sourceRemoved' },
      refreshEpisodes: { state: 'disabled', because: 'sourceRemoved' },
    })
  })

  it('disables every action of an unavailable source', () => {
    const actions = seasonActions({ status: 'unavailable', reason: 'missing' })

    expect(actions.follow).toEqual({
      state: 'disabled',
      because: 'sourceUnavailable',
    })
  })

  it('shows nothing source-backed until the answer arrives', () => {
    expect(seasonActions(undefined).follow).toEqual({ state: 'hidden' })
  })
})
