import { describe, expect, it, vi } from 'vitest'
import {
  deleteModelFile,
  listModelFiles,
  type OpfsModelStoreDeps,
} from './opfsModelStore'

/**
 * Exercises opfsModelStore against a fake OPFS directory: listing returns file
 * entries with sizes while skipping subdirectories, deletion forwards to
 * removeEntry, and a missing OPFS root degrades to an empty list / no-op rather
 * than throwing.
 */

function fileHandle(size: number): FileSystemFileHandle {
  return {
    kind: 'file',
    getFile: () => Promise.resolve({ size } as File),
  } as unknown as FileSystemFileHandle
}

function makeRoot(
  files: Record<string, number>,
  removeEntry = vi.fn().mockResolvedValue(undefined)
) {
  return {
    async *entries(): AsyncGenerator<[string, FileSystemHandle]> {
      for (const [name, size] of Object.entries(files)) {
        yield [name, fileHandle(size)]
      }
      yield ['a-subdir', { kind: 'directory' } as FileSystemHandle]
    },
    removeEntry,
  }
}

function makeDeps(root: unknown): OpfsModelStoreDeps {
  return { getRoot: () => Promise.resolve(root as never) }
}

describe('opfsModelStore', () => {
  it('lists file entries with sizes and skips directories', async () => {
    const deps = makeDeps(makeRoot({ anime: 4096, 'fast-anime': 2048 }))

    const entries = await listModelFiles(deps)

    expect(entries).toEqual([
      { id: 'anime', sizeBytes: 4096 },
      { id: 'fast-anime', sizeBytes: 2048 },
    ])
  })

  it('returns an empty list when OPFS is unavailable', async () => {
    expect(await listModelFiles(makeDeps(null))).toEqual([])
  })

  it('deletes a model file by id', async () => {
    const removeEntry = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps(makeRoot({ anime: 1 }, removeEntry))

    await deleteModelFile('anime', deps)

    expect(removeEntry).toHaveBeenCalledWith('anime')
  })

  it('is a no-op when deleting and OPFS is unavailable', async () => {
    await expect(
      deleteModelFile('anime', makeDeps(null))
    ).resolves.toBeUndefined()
  })
})
