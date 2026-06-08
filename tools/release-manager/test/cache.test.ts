import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  downloadBuild,
  reconcileBuilds,
  removeBuild,
} from '../src/core/cache.js'
import type { CachedBuild, ReleaseAsset } from '../src/core/types.js'

let dir: string

function makeZip(version: string): Uint8Array {
  return zipSync({
    'manifest.json': strToU8(JSON.stringify({ version, name: 'da' })),
    'background.js': strToU8('console.log("hi")'),
  })
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function stubFetch(body: Uint8Array, status = 200): typeof fetch {
  return async () => {
    if (status !== 200) {
      return new Response('err', { status })
    }
    return new Response(toArrayBuffer(body), { status })
  }
}

function asset(tag: string, version: string): ReleaseAsset {
  return {
    tag,
    version,
    channel: 'preview',
    publishedAt: '2026-01-01T00:00:00Z',
    assetUrl: `https://example.com/${tag}`,
  }
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rm-cache-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('downloadBuild', () => {
  it('unzips into the cache dir and reads the manifest version', async () => {
    const result = await downloadBuild(
      dir,
      asset('preview-pr-1', '9.9.9'),
      stubFetch(makeZip('9.9.9'))
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.version).toBe('9.9.9')
      expect(result.data.tag).toBe('preview-pr-1')
    }

    const manifest = await readFile(
      join(dir, 'cache', 'preview-pr-1', 'manifest.json'),
      'utf8'
    )
    expect(JSON.parse(manifest).version).toBe('9.9.9')
  })

  it('leaves no temp dir behind on success', async () => {
    await downloadBuild(dir, asset('t', '1.0.0'), stubFetch(makeZip('1.0.0')))
    await expect(
      readFile(join(dir, 'cache', '.tmp-t', 'manifest.json'))
    ).rejects.toThrow()
  })

  it('refreshes an existing tag on re-download', async () => {
    await downloadBuild(dir, asset('t', '1.0.0'), stubFetch(makeZip('1.0.0')))
    const second = await downloadBuild(
      dir,
      asset('t', '2.0.0'),
      stubFetch(makeZip('2.0.0'))
    )

    expect(second.success).toBe(true)
    if (second.success) {
      expect(second.data.version).toBe('2.0.0')
    }
    const manifest = await readFile(
      join(dir, 'cache', 't', 'manifest.json'),
      'utf8'
    )
    expect(JSON.parse(manifest).version).toBe('2.0.0')
  })

  it('maps a download failure to a network error', async () => {
    const result = await downloadBuild(
      dir,
      asset('t', '1.0.0'),
      stubFetch(new Uint8Array(), 500)
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('network')
    }
  })

  it('sends a bearer authorization header when a token is given', async () => {
    let seen: HeadersInit | undefined
    const recordingFetch: typeof fetch = async (_url, init) => {
      seen = init?.headers
      return new Response(toArrayBuffer(makeZip('1.0.0')), { status: 200 })
    }
    await downloadBuild(dir, asset('t', '1.0.0'), recordingFetch, 'tok-123')
    expect((seen as Record<string, string>).Authorization).toBe(
      'Bearer tok-123'
    )
  })

  it('omits the authorization header when no token is given', async () => {
    let seen: HeadersInit | undefined
    const recordingFetch: typeof fetch = async (_url, init) => {
      seen = init?.headers
      return new Response(toArrayBuffer(makeZip('1.0.0')), { status: 200 })
    }
    await downloadBuild(dir, asset('t', '1.0.0'), recordingFetch)
    expect((seen as Record<string, string>).Authorization).toBeUndefined()
  })
})

describe('removeBuild', () => {
  it('removes the cache dir for a tag', async () => {
    await downloadBuild(dir, asset('t', '1.0.0'), stubFetch(makeZip('1.0.0')))
    const result = await removeBuild(dir, 't')
    expect(result.success).toBe(true)
    await expect(
      readFile(join(dir, 'cache', 't', 'manifest.json'))
    ).rejects.toThrow()
  })
})

describe('reconcileBuilds', () => {
  it('drops index entries with no dir on disk', async () => {
    await downloadBuild(
      dir,
      asset('keep', '1.0.0'),
      stubFetch(makeZip('1.0.0'))
    )
    const index: CachedBuild[] = [
      {
        tag: 'keep',
        version: '1.0.0',
        channel: 'preview',
        downloadedAt: '2026-01-01T00:00:00Z',
      },
      {
        tag: 'ghost',
        version: '1.0.0',
        channel: 'preview',
        downloadedAt: '2026-01-01T00:00:00Z',
      },
    ]

    const reconciled = await reconcileBuilds(dir, index)
    expect(reconciled.map((b) => b.tag)).toEqual(['keep'])
  })

  it('ignores the temp and active entries on disk', async () => {
    await mkdir(join(dir, 'cache', '.tmp-x'), { recursive: true })
    await writeFile(join(dir, 'cache', '.tmp-x', 'f'), 'x')
    const reconciled = await reconcileBuilds(dir, [])
    expect(reconciled).toEqual([])
  })
})
