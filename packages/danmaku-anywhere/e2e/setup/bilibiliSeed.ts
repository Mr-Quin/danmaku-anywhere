import type {
  CommentEntity,
  EpisodeInsert,
  SeasonInsert,
} from '@danmaku-anywhere/danmaku-converter'

// Canonical Bilibili season for mount-tree specs. providerIds/indexedId line
// up with e2e/fixtures/bilibili-season.json so upstream calls mocked with that
// fixture resolve against this season.
export function makeBilibiliSeason(
  overrides: Partial<SeasonInsert> = {}
): SeasonInsert {
  return {
    providerIds: { seasonId: 41410, mediaId: 28219412 },
    manifestId: 'bilibili',
    namespaceKey: 'bilibili',
    indexedId: '41410',
    title: '葬送的芙莉莲',
    type: '番剧',
    imageUrl: 'https://bilibili-cdn.invalid/x.jpg',
    episodeCount: 28,
    year: 2023,
    schemaVersion: 1,
    ...overrides,
  }
}

interface BilibiliEpisodeOpts {
  cid?: number
  episodeNumber?: string
  comments?: CommentEntity[]
}

// The default cid matches the season fixture's first episode, so a bookmark
// snapshot dedups it and leaves the fixture's second episode as the only
// unfetched stub.
export function makeBilibiliEpisode(
  seasonId: number,
  opts: BilibiliEpisodeOpts = {}
): EpisodeInsert {
  const { cid = 1300001, episodeNumber = '1', comments = [] } = opts
  return {
    providerIds: { cid, aid: 100000 + cid, bvid: `BV${cid}` },
    indexedId: String(cid),
    title: `Ep${episodeNumber}`,
    episodeNumber,
    seasonId,
    comments,
    commentCount: comments.length,
    schemaVersion: 4,
    lastChecked: 0,
  }
}
