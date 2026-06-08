import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fetchReleases, parseReleases } from '../src/core/github.js'

const fixtureUrl = new URL('./fixtures/releases.json', import.meta.url)

async function loadFixture(): Promise<unknown> {
  const raw = await readFile(fileURLToPath(fixtureUrl), 'utf8')
  return JSON.parse(raw)
}

describe('parseReleases', () => {
  it('classifies stable vs preview by the prerelease boolean', async () => {
    const releases = parseReleases(await loadFixture())

    const stable = releases.find((r) => r.tag === 'v1.2.0')
    expect(stable?.channel).toBe('stable')

    const nightly = releases.find((r) => r.tag === 'nightly-123456')
    expect(nightly?.channel).toBe('preview')
  })

  it('derives preview subtype from tag prefixes', async () => {
    const releases = parseReleases(await loadFixture())
    const subtypeOf = (tag: string) =>
      releases.find((r) => r.tag === tag)?.previewSubtype

    expect(subtypeOf('nightly-123456')).toBe('nightly')
    expect(subtypeOf('preview-pr-460')).toBe('pr')
    expect(subtypeOf('preview-branch-feature-foo')).toBe('branch')
    expect(subtypeOf('preview-manual-11')).toBe('manual')
  })

  it('treats an unrecognized preview tag as generic, never crashing', async () => {
    const releases = parseReleases(await loadFixture())
    const generic = releases.find((r) => r.tag === 'latest-preview')

    expect(generic?.channel).toBe('preview')
    expect(generic?.previewSubtype).toBe('generic')
  })

  it('resolves the chrome asset url and reads the version', async () => {
    const releases = parseReleases(await loadFixture())
    const stable = releases.find((r) => r.tag === 'v1.2.0')

    expect(stable?.version).toBe('1.2.0')
    expect(stable?.assetUrl).toBe(
      'https://api.github.com/repos/Mr-Quin/danmaku-anywhere/releases/assets/2'
    )
  })

  it('drops releases without a chrome asset', async () => {
    const releases = parseReleases(await loadFixture())
    expect(releases.find((r) => r.tag === 'v1.1.0-no-chrome')).toBeUndefined()
  })
})

describe('fetchReleases', () => {
  it('sends a bearer token when provided', async () => {
    let seenAuth: string | null = null
    const stubFetch: typeof fetch = async (_url, init) => {
      const headers = new Headers(init?.headers)
      seenAuth = headers.get('Authorization')
      return new Response(JSON.stringify([]), { status: 200 })
    }

    const result = await fetchReleases('tok', stubFetch)
    expect(result.success).toBe(true)
    expect(seenAuth).toBe('Bearer tok')
  })

  it('maps 401 to an auth error', async () => {
    const stubFetch: typeof fetch = async () =>
      new Response('no', { status: 401 })
    const result = await fetchReleases(undefined, stubFetch)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('auth')
    }
  })

  it('maps a rate-limited 403 to rate-limited', async () => {
    const stubFetch: typeof fetch = async () =>
      new Response('limit', {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0' },
      })
    const result = await fetchReleases(undefined, stubFetch)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('rate-limited')
    }
  })

  it('maps a thrown fetch to a network error', async () => {
    const stubFetch: typeof fetch = async () => {
      throw new Error('boom')
    }
    const result = await fetchReleases(undefined, stubFetch)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('network')
    }
  })
})
