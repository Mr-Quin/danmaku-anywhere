/**
 * Live smoke test for builtin:dandanplay against the production proxy at
 * api.danmaku.weeblify.app. Walks all three pipelines end-to-end:
 *
 *   search → first result → episodes → first episode → danmaku
 *
 * Run manually: `pnpm --filter @danmaku-anywhere/dango-manifests smoke [keyword]`
 *
 * NOT wired into CI — hits a real network endpoint and is not deterministic.
 * Exists to verify the manifest wire format still matches the live API when
 * something on the upstream side changes.
 */
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import builtinDandanplay from '../src/manifests/builtin-dandanplay.json' with {
  type: 'json',
}

const keyword = process.argv[2] ?? 'Frieren'

const fetcher = async (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string }
) => {
  const res = await fetch(input, init)
  const headers = new Map<string, string>()
  res.headers.forEach((value, key) => {
    headers.set(key, value)
  })
  return {
    status: res.status,
    text: async () => {
      return res.text()
    },
    bytes: async () => {
      return new Uint8Array(await res.arrayBuffer())
    },
    headers,
  }
}

interface SearchHit {
  providerIds: { animeId: number; bangumiId: string }
  title: string
  type: string
  episodeCount: number
  year?: number
}

interface EpisodeHit {
  providerIds: { episodeId: number; animeId: number; bangumiId: string }
  title: string
  episodeNumber: string
}

interface CommentHit {
  cid: number
  p: string
  m: string
}

async function main() {
  const manifest = zManifest.parse(builtinDandanplay)
  const runner = new ManifestRunner(manifest, { fetcher })

  console.log(`[smoke] search keyword="${keyword}"`)
  const searchResults = (await runner.runSearch({ q: keyword })) as SearchHit[]
  console.log(`[smoke] search → ${searchResults.length} results`)
  if (searchResults.length === 0) {
    throw new Error('search returned no results')
  }
  const first = searchResults[0]
  console.log(
    `[smoke]   first: ${first.title} (animeId=${first.providerIds.animeId}, bangumiId=${first.providerIds.bangumiId}, episodes=${first.episodeCount}, year=${first.year ?? 'n/a'})`
  )

  console.log(`[smoke] episodes bangumiId=${first.providerIds.bangumiId}`)
  const episodes = (await runner.runEpisodes({
    bangumiId: first.providerIds.bangumiId,
  })) as EpisodeHit[]
  console.log(`[smoke] episodes → ${episodes.length} entries`)
  if (episodes.length === 0) {
    throw new Error('episodes returned no entries')
  }
  const firstEp = episodes[0]
  console.log(
    `[smoke]   first episode: ${firstEp.title} (episodeId=${firstEp.providerIds.episodeId}, episodeNumber=${firstEp.episodeNumber})`
  )
  if (
    firstEp.providerIds.animeId !== first.providerIds.animeId ||
    firstEp.providerIds.bangumiId !== first.providerIds.bangumiId
  ) {
    throw new Error('episode providerIds do not carry back the parent anime')
  }

  console.log(`[smoke] danmaku episodeId=${firstEp.providerIds.episodeId}`)
  const comments = (await runner.runDanmaku({
    episodeId: firstEp.providerIds.episodeId,
  })) as CommentHit[]
  console.log(`[smoke] danmaku → ${comments.length} comments`)
  if (comments.length > 0) {
    const c = comments[0]
    console.log(`[smoke]   first comment: cid=${c.cid} p="${c.p}" m="${c.m}"`)
  }

  console.log('[smoke] OK')
}

main().catch((err) => {
  console.error('[smoke] FAILED:', err)
  process.exit(1)
})
