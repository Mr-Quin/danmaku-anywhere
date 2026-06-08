import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ReleaseManager } from '../src/core/manager.js'
import type { ReleaseAsset } from '../src/core/types.js'

let dir: string

function makeZip(version: string): ArrayBuffer {
  const bytes = zipSync({
    'manifest.json': strToU8(JSON.stringify({ version })),
  })
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

const releases: ReleaseAsset[] = [
  {
    tag: 'preview-pr-1',
    version: '1.0.0',
    channel: 'preview',
    previewSubtype: 'pr',
    publishedAt: '2026-01-01T00:00:00Z',
    assetUrl: 'https://example.com/a',
  },
  {
    tag: 'v2.0.0',
    version: '2.0.0',
    channel: 'stable',
    publishedAt: '2026-02-01T00:00:00Z',
    assetUrl: 'https://example.com/b',
  },
]

function makeManager(opts?: {
  hangFirstDownload?: () => void
}): ReleaseManager {
  let firstDownload = true
  return new ReleaseManager({
    dataDir: dir,
    fetchReleases: async () => ({ success: true, data: releases }),
    downloadAsset: async (_url) => {
      if (opts?.hangFirstDownload && firstDownload) {
        firstDownload = false
        return new Promise(() => {})
      }
      return new Response(makeZip('1.0.0'), { status: 200 })
    },
  })
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rm-manager-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ReleaseManager', () => {
  it('lists releases', async () => {
    const manager = makeManager()
    const result = await manager.listReleases()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
    }
  })

  it('downloads, records the build, and reports it in state', async () => {
    const manager = makeManager()
    const dl = await manager.downloadBuild('preview-pr-1')
    expect(dl.success).toBe(true)

    const state = await manager.getState()
    expect(state.builds.map((b) => b.tag)).toContain('preview-pr-1')
  })

  it('rejects an unknown tag on download', async () => {
    const manager = makeManager()
    const result = await manager.downloadBuild('nope')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('not-found')
    }
  })

  it('sets a build active and exposes the active path', async () => {
    const manager = makeManager()
    await manager.downloadBuild('preview-pr-1')
    const active = await manager.setActive('preview-pr-1')
    expect(active.success).toBe(true)

    const state = await manager.getState()
    expect(state.activeTag).toBe('preview-pr-1')
    expect(state.activePath).toBeDefined()
  })

  it('refuses to set active a tag that is not cached', async () => {
    const manager = makeManager()
    const result = await manager.setActive('v2.0.0')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('not-found')
    }
  })

  it('refuses to remove the active build', async () => {
    const manager = makeManager()
    await manager.downloadBuild('preview-pr-1')
    await manager.setActive('preview-pr-1')

    const result = await manager.removeBuild('preview-pr-1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('conflict')
    }
  })

  it('removes a non-active build', async () => {
    const manager = makeManager()
    await manager.downloadBuild('preview-pr-1')
    const result = await manager.removeBuild('preview-pr-1')
    expect(result.success).toBe(true)

    const state = await manager.getState()
    expect(state.builds.map((b) => b.tag)).not.toContain('preview-pr-1')
  })

  it('clears activeTag in getState when the active build dir is removed', async () => {
    const manager = makeManager()
    await manager.downloadBuild('preview-pr-1')
    await manager.setActive('preview-pr-1')

    await rm(join(dir, 'cache', 'preview-pr-1'), {
      recursive: true,
      force: true,
    })

    const state = await manager.getState()
    expect(state.activeTag).toBeUndefined()
    expect(state.activePath).toBeUndefined()
    expect(state.builds.map((b) => b.tag)).not.toContain('preview-pr-1')
  })

  it('updates the token and reports hasToken without leaking it', async () => {
    const manager = makeManager()
    await manager.updateToken('tok-123')

    const state = await manager.getState()
    expect(state.hasToken).toBe(true)
    expect(JSON.stringify(state)).not.toContain('tok-123')
  })

  it('rejects a concurrent download of the same tag', async () => {
    const manager = makeManager({ hangFirstDownload: () => {} })
    const first = manager.downloadBuild('preview-pr-1')
    const second = await manager.downloadBuild('preview-pr-1')

    expect(second.success).toBe(false)
    if (!second.success) {
      expect(second.error.kind).toBe('conflict')
    }
    void first
  })
})
