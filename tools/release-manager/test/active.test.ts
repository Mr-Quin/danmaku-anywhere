import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { activePath, clearActive, setActive } from '../src/core/active.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rm-active-'))
  await mkdir(join(dir, 'cache', 'v1'), { recursive: true })
  await mkdir(join(dir, 'cache', 'v2'), { recursive: true })
  await writeFile(join(dir, 'cache', 'v1', 'manifest.json'), 'one')
  await writeFile(join(dir, 'cache', 'v2', 'manifest.json'), 'two')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('setActive', () => {
  it('copies the requested build into the active dir', async () => {
    const result = await setActive(dir, 'v1')
    expect(result.success).toBe(true)

    const content = await readFile(
      join(activePath(dir), 'manifest.json'),
      'utf8'
    )
    expect(content).toBe('one')
  })

  it('replaces active contents when switching builds', async () => {
    await setActive(dir, 'v1')
    await setActive(dir, 'v2')

    const content = await readFile(
      join(activePath(dir), 'manifest.json'),
      'utf8'
    )
    expect(content).toBe('two')
  })

  it('fails with a swap error when the cache dir is missing', async () => {
    const result = await setActive(dir, 'does-not-exist')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.kind).toBe('swap')
    }
  })

  it('empties the active dir when cleared', async () => {
    await setActive(dir, 'v1')
    const result = await clearActive(dir)
    expect(result.success).toBe(true)

    const entries = await readdir(activePath(dir))
    expect(entries).toEqual([])
  })
})
