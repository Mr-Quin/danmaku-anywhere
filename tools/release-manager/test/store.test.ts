import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConfigStore } from '../src/core/store.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rm-store-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ConfigStore', () => {
  it('returns first-run defaults when no config exists', async () => {
    const store = new ConfigStore(dir)
    const config = await store.load()

    expect(config.builds).toEqual([])
    expect(config.githubToken).toBeUndefined()
    expect(config.activeTag).toBeUndefined()
  })

  it('round-trips a saved config', async () => {
    const store = new ConfigStore(dir)
    await store.save({
      githubToken: 'secret',
      activeTag: 'v1.0.0',
      builds: [
        {
          tag: 'v1.0.0',
          version: '1.0.0',
          channel: 'stable',
          downloadedAt: '2026-01-01T00:00:00Z',
        },
      ],
    })

    const reloaded = await new ConfigStore(dir).load()
    expect(reloaded.githubToken).toBe('secret')
    expect(reloaded.activeTag).toBe('v1.0.0')
    expect(reloaded.builds).toHaveLength(1)
  })

  it('writes config.json with 0600 permissions', async () => {
    const store = new ConfigStore(dir)
    await store.save({ builds: [] })

    const info = await stat(join(dir, 'config.json'))
    expect(info.mode & 0o777).toBe(0o600)
  })

  it('masks the token in the public state and never leaks the raw value', async () => {
    const store = new ConfigStore(dir)
    await store.save({ githubToken: 'super-secret', builds: [] })

    const state = store.toPublicState(await store.load())
    expect(state.hasToken).toBe(true)
    const serialized = JSON.stringify(state)
    expect(serialized).not.toContain('super-secret')
    expect(serialized).not.toContain('githubToken')
  })

  it('reports hasToken false when no token is set', async () => {
    const store = new ConfigStore(dir)
    await store.save({ builds: [] })

    const state = store.toPublicState(await store.load())
    expect(state.hasToken).toBe(false)
  })
})
