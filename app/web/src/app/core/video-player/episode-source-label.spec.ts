import type { GenericEpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import { episodeSourceLabel } from './episode-source-label'

/**
 * The episode list and video toolbar render this label under each episode.
 * Custom episodes have no season, and orphaned source episodes have no
 * manifestId; neither may render as a blank line.
 */

const customEpisode = {
  id: 1,
  title: 'local upload',
  commentCount: 2,
} as unknown as GenericEpisodeLite

function sourceEpisode(manifestId: string | undefined): GenericEpisodeLite {
  return {
    id: 2,
    title: 'ep 1',
    commentCount: 2,
    seasonId: 7,
    season: { title: 'Show', manifestId },
  } as unknown as GenericEpisodeLite
}

describe('episodeSourceLabel', () => {
  it('labels a custom episode as Custom', () => {
    expect(episodeSourceLabel(customEpisode)).toBe('Custom')
  })

  it('derives the label from the season manifestId', () => {
    expect(episodeSourceLabel(sourceEpisode('bilibili'))).toBe('Bilibili')
  })

  it('falls back to the manifestId for an unknown manifest', () => {
    expect(episodeSourceLabel(sourceEpisode('mango'))).toBe('mango')
  })

  it('returns an empty label only for an orphaned source episode', () => {
    expect(episodeSourceLabel(sourceEpisode(undefined))).toBe('')
  })
})
