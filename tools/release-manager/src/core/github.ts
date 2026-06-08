import { err, ok, type Result } from '@danmaku-anywhere/result'
import type {
  Channel,
  PreviewSubtype,
  ReleaseAsset,
  ReleaseManagerError,
} from './types.js'

const RELEASES_URL =
  'https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases?per_page=100'

const CHROME_ASSET_SUFFIX = '-chrome.zip'

interface RawAsset {
  name: string
  url: string
}

interface RawRelease {
  tag_name: string
  prerelease: boolean
  published_at: string
  assets: RawAsset[]
}

function previewSubtypeFromTag(tag: string): PreviewSubtype {
  if (tag.startsWith('nightly-')) {
    return 'nightly'
  }
  if (tag.startsWith('preview-pr-')) {
    return 'pr'
  }
  if (tag.startsWith('preview-branch-')) {
    return 'branch'
  }
  if (tag.startsWith('preview-manual-')) {
    return 'manual'
  }
  return 'generic'
}

function versionFromAssetName(name: string): string {
  const base = name.slice(0, name.length - CHROME_ASSET_SUFFIX.length)
  const prefix = 'danmaku-anywhere-'
  if (base.startsWith(prefix)) {
    return base.slice(prefix.length)
  }
  return base
}

function toReleaseAsset(raw: RawRelease): ReleaseAsset | undefined {
  const asset = raw.assets.find((a) => a.name.endsWith(CHROME_ASSET_SUFFIX))
  if (!asset) {
    return undefined
  }

  const channel: Channel = raw.prerelease ? 'preview' : 'stable'
  const previewSubtype = raw.prerelease
    ? previewSubtypeFromTag(raw.tag_name)
    : undefined

  return {
    tag: raw.tag_name,
    version: versionFromAssetName(asset.name),
    channel,
    previewSubtype,
    publishedAt: raw.published_at,
    assetUrl: asset.url,
  }
}

export function parseReleases(payload: unknown): ReleaseAsset[] {
  if (!Array.isArray(payload)) {
    return []
  }

  const result: ReleaseAsset[] = []
  for (const raw of payload as RawRelease[]) {
    const asset = toReleaseAsset(raw)
    if (asset) {
      result.push(asset)
    }
  }
  return result
}

export async function fetchReleases(
  token: string | undefined,
  fetchImpl: typeof fetch = fetch
): Promise<Result<ReleaseAsset[], ReleaseManagerError>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetchImpl(RELEASES_URL, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed'
    return err({ kind: 'network', message })
  }

  if (response.status === 401) {
    return err({
      kind: 'auth',
      status: 401,
      message: 'GitHub token is missing or invalid',
    })
  }

  if (response.status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining')
    if (remaining === '0') {
      return err({ kind: 'rate-limited', message: 'GitHub rate limit reached' })
    }
    return err({
      kind: 'auth',
      status: 403,
      message: 'GitHub rejected the request',
    })
  }

  if (!response.ok) {
    return err({
      kind: 'network',
      message: `GitHub responded with ${response.status}`,
    })
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid json'
    return err({ kind: 'network', message })
  }

  return ok(parseReleases(payload))
}
