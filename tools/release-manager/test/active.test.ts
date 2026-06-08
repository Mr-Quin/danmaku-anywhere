import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { activePath, clearActive, setActive } from '../src/core/active.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rm-active-'))
  await mkdir(join(dir, 'cache', 'v1'), { recursive: true })
  await mkdir(join(dir, 'cache', 'v2'), { recursive: true })
  await writeFile(join(dir, 'cache', 'v1', 'marker'), 'one')
  await writeFile(join(dir, 'cache', 'v2', 'marker'), 'two')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('setActive', () => {
  it('points the active link at the requested cache dir', async () => {
    const result = await setActive(dir, 'v1')
    expect(result.success).toBe(true)

    const resolved = await realpath(activePath(dir))
    expect(resolved).toBe(await realpath(join(dir, 'cache', 'v1')))
  })

  it('repoints an existing link to a new target', async () => {
    await setActive(dir, 'v1')
    await setActive(dir, 'v2')

    const resolved = await realpath(activePath(dir))
    expect(resolved).toBe(await realpath(join(dir, 'cache', 'v2')))
  })

  it('fails with a swap error when the cache dir is missing', async () => {
    const result = await setActive(dir, 'does-not-exist')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('swap')
    }
  })

  it('clears the active link', async () => {
    await setActive(dir, 'v1')
    const result = await clearActive(dir)
    expect(result.success).toBe(true)

    await expect(realpath(activePath(dir))).rejects.toThrow()
  })
})
