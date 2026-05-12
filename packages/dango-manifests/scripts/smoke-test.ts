/**
 * Live smoke test for shipped manifests. Walks all three pipelines end-to-end:
 *
 *   search → first result → episodes → first episode → danmaku
 *
 * Usage:
 *   pnpm smoke ddp [keyword]         # api.danmaku.weeblify.app proxy
 *   pnpm smoke bilibili [keyword]    # api.bilibili.com direct
 *   pnpm smoke tencent [keyword]     # pbaccess.video.qq.com + dm.video.qq.com
 *
 * NOT wired into CI — hits real network endpoints and is not deterministic.
 * Exists to verify each manifest's wire format still matches the live API
 * when an upstream changes things.
 */
import { ManifestRunner, zManifest } from '@danmaku-anywhere/dango'
import builtinBilibili from '../src/manifests/builtin-bilibili.json' with {
  type: 'json',
}
import builtinDandanplay from '../src/manifests/builtin-dandanplay.json' with {
  type: 'json',
}
import builtinTencent from '../src/manifests/builtin-tencent.json' with {
  type: 'json',
}

const source = process.argv[2]
const keyword = process.argv[3] ?? 'Frieren'

if (!source) {
  console.error('usage: pnpm smoke <source> [keyword]')
  console.error('  source: ddp | bilibili | tencent')
  process.exit(2)
}

// Per-host cookie jar so bilibili.com etc. can hand us back the cookies they
// expect on subsequent requests (a buvid3 from a homepage visit unblocks the
// 412 anti-bot wall on api.bilibili.com).
const cookieJar = new Map<string, Map<string, string>>()

function rootDomain(host: string): string {
  const parts = host.split('.')
  if (parts.length <= 2) return host
  return parts.slice(-2).join('.')
}

function getCookieHeader(host: string): string {
  const domain = rootDomain(host)
  const jar = cookieJar.get(domain)
  if (!jar || jar.size === 0) return ''
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

function storeCookies(host: string, setCookieHeaders: string[]) {
  if (setCookieHeaders.length === 0) return
  const domain = rootDomain(host)
  let jar = cookieJar.get(domain)
  if (!jar) {
    jar = new Map()
    cookieJar.set(domain, jar)
  }
  for (const piece of setCookieHeaders) {
    const first = piece.split(';')[0]?.trim()
    if (!first) continue
    const eq = first.indexOf('=')
    if (eq <= 0) continue
    jar.set(first.slice(0, eq), first.slice(eq + 1))
  }
}

async function rawFetch(
  input: string,
  init: {
    method?: string
    headers?: Record<string, string>
    body?: string
  } = {}
) {
  const host = new URL(input).hostname
  const cookieHeader = getCookieHeader(host)
  // A browser-ish UA defeats bilibili's "is this a bot" sniff. The extension
  // gets this for free from being a browser — Node doesn't.
  const mergedHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ...(init.headers ?? {}),
  }
  if (cookieHeader) {
    mergedHeaders.Cookie = cookieHeader
  }
  const res = await fetch(input, { ...init, headers: mergedHeaders })
  // Node's Headers exposes multiple Set-Cookie via getSetCookie(); only that
  // accessor preserves them — `.get('set-cookie')` joins with commas and
  // confuses any naive splitter.
  const setCookies =
    typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie ===
    'function'
      ? (res.headers as { getSetCookie: () => string[] }).getSetCookie()
      : []
  storeCookies(host, setCookies)
  return res
}

const fetcher = async (
  input: string,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
    rewriteHeaders?: Record<string, string>
  }
) => {
  // In the browser, fetch refuses to let JS set Origin/Referer/User-Agent and
  // the extension's FetchLike re-injects them via declarativeNetRequest. From
  // Node there's no such restriction, so we can merge them straight into the
  // outgoing headers.
  const mergedInit = init && {
    ...init,
    headers: { ...(init.headers ?? {}), ...(init.rewriteHeaders ?? {}) },
  }
  const res = await rawFetch(input, mergedInit ?? init)
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

async function warmCookies(host: string) {
  await rawFetch(`https://www.${host}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
}

interface Pipeline<TSearch, TEpisode> {
  manifest: unknown
  searchInputs: (q: string) => Record<string, unknown>
  episodeInputs: (s: TSearch) => Record<string, unknown>
  danmakuInputs: (e: TEpisode) => Record<string, unknown>
  describeSearch: (s: TSearch) => string
  describeEpisode: (e: TEpisode) => string
  /** Optional host to pre-visit to warm cookies (defeats anti-bot 412s). */
  warmCookieHost?: string
}

interface DdpSearch {
  providerIds: { animeId: number; bangumiId: string }
  title: string
  episodeCount: number
  year?: number
}
interface DdpEpisode {
  providerIds: { episodeId: number; animeId: number; bangumiId: string }
  title: string
  episodeNumber: string
}

interface BiliSearch {
  providerIds: { seasonId: string; mediaId: string }
  title: string
  episodeCount: number
  type: string
}
interface BiliEpisode {
  providerIds: {
    cid: string
    aid: string
    bvid: string
    epId: string
    seasonId: string
  }
  title: string
  episodeNumber: string
}

interface TencentSearch {
  providerIds: { cid: string }
  title: string
  type: string
  episodeCount: number
}

interface TencentEpisode {
  providerIds: { vid: string; cid: string }
  title: string
  episodeNumber: string
}

const pipelines: Record<string, Pipeline<unknown, unknown>> = {
  ddp: {
    manifest: builtinDandanplay,
    searchInputs: (q) => {
      return { q }
    },
    episodeInputs: (s) => {
      return { bangumiId: (s as DdpSearch).providerIds.bangumiId }
    },
    danmakuInputs: (e) => {
      return { episodeId: (e as DdpEpisode).providerIds.episodeId }
    },
    describeSearch: (s) => {
      const ds = s as DdpSearch
      return `${ds.title} (animeId=${ds.providerIds.animeId}, episodes=${ds.episodeCount}, year=${ds.year ?? 'n/a'})`
    },
    describeEpisode: (e) => {
      const de = e as DdpEpisode
      return `${de.title} (episodeId=${de.providerIds.episodeId})`
    },
  },
  bilibili: {
    manifest: builtinBilibili,
    searchInputs: (q) => {
      return { q }
    },
    episodeInputs: (s) => {
      return { seasonId: (s as BiliSearch).providerIds.seasonId }
    },
    danmakuInputs: (e) => {
      return {
        cid: (e as BiliEpisode).providerIds.cid,
        danmakuFormat: 'protobuf',
      }
    },
    describeSearch: (s) => {
      const bs = s as BiliSearch
      return `${bs.title} (seasonId=${bs.providerIds.seasonId}, type=${bs.type}, episodes=${bs.episodeCount})`
    },
    describeEpisode: (e) => {
      const be = e as BiliEpisode
      return `${be.title} (cid=${be.providerIds.cid}, ep=${be.episodeNumber})`
    },
    warmCookieHost: 'bilibili.com',
  },
  tencent: {
    manifest: builtinTencent,
    searchInputs: (q) => {
      return { q }
    },
    episodeInputs: (s) => {
      return { cid: (s as TencentSearch).providerIds.cid }
    },
    danmakuInputs: (e) => {
      return { vid: (e as TencentEpisode).providerIds.vid }
    },
    describeSearch: (s) => {
      const ts = s as TencentSearch
      return `${ts.title} (cid=${ts.providerIds.cid}, type=${ts.type}, episodes=${ts.episodeCount})`
    },
    describeEpisode: (e) => {
      const te = e as TencentEpisode
      return `${te.title} (vid=${te.providerIds.vid}, ep=${te.episodeNumber})`
    },
  },
}

interface CommentHit {
  cid?: number
  p: string
  m: string
}

async function main() {
  const pipeline = pipelines[source!]
  if (!pipeline) {
    console.error(
      `unknown source: ${source}. Valid: ${Object.keys(pipelines).join(', ')}`
    )
    process.exit(2)
  }

  const manifest = zManifest.parse(pipeline.manifest)
  const runner = new ManifestRunner(manifest, { fetcher })

  if (pipeline.warmCookieHost) {
    console.log(
      `[smoke:${source}] warming cookies from www.${pipeline.warmCookieHost}`
    )
    await warmCookies(pipeline.warmCookieHost)
  }

  console.log(`[smoke:${source}] search keyword="${keyword}"`)
  const searchResults = (await runner.runSearch(
    pipeline.searchInputs(keyword)
  )) as unknown[]
  console.log(`[smoke:${source}] search → ${searchResults.length} results`)
  if (searchResults.length === 0) {
    throw new Error('search returned no results')
  }
  const first = searchResults[0]
  console.log(`[smoke:${source}]   first: ${pipeline.describeSearch(first)}`)

  console.log(`[smoke:${source}] episodes`)
  const episodes = (await runner.runEpisodes(
    pipeline.episodeInputs(first)
  )) as unknown[]
  console.log(`[smoke:${source}] episodes → ${episodes.length} entries`)
  if (episodes.length === 0) {
    throw new Error('episodes returned no entries')
  }
  const firstEp = episodes[0]
  console.log(
    `[smoke:${source}]   first episode: ${pipeline.describeEpisode(firstEp)}`
  )

  console.log(`[smoke:${source}] danmaku`)
  const comments = (await runner.runDanmaku(
    pipeline.danmakuInputs(firstEp)
  )) as CommentHit[]
  console.log(`[smoke:${source}] danmaku → ${comments.length} comments`)
  if (comments.length > 0) {
    const c = comments[0]
    console.log(
      `[smoke:${source}]   first comment: ${c.cid !== undefined ? `cid=${c.cid} ` : ''}p="${c.p}" m="${c.m}"`
    )
  }

  console.log(`[smoke:${source}] OK`)
}

main().catch((err) => {
  console.error(`[smoke:${source}] FAILED:`, err)
  if (source === 'bilibili') {
    console.error(
      `\n[smoke:${source}] note: bilibili's anti-bot wall rejects scripted` +
        ' callers that do not carry the full browser fingerprint set' +
        ' (buvid_fp, b_lsid, etc.). The manifest itself is validated by the' +
        ' fixture tests; live verification happens in the extension via' +
        ' Plan B integration, where the browser context fills these in.'
    )
  }
  process.exit(1)
})
