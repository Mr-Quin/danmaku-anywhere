/**
 * Enumerates and evicts the model files that opfsFileCache writes, keyed by
 * model id. Runs in an extension-origin context (the background worker), which
 * shares one unpartitioned OPFS root with the segmenter iframe, so the
 * management UI manages exactly the singleton files the iframe downloads. Total
 * usage is derived by callers summing the listed sizes.
 */

export interface ModelStorageEntry {
  id: string
  sizeBytes: number
}

type DirHandle = Pick<FileSystemDirectoryHandle, 'entries' | 'removeEntry'>

export interface OpfsModelStoreDeps {
  /** Null when OPFS is unavailable in this context. */
  getRoot: () => Promise<DirHandle | null>
}

function createDefaultDeps(): OpfsModelStoreDeps {
  return {
    async getRoot() {
      const storage = globalThis.navigator?.storage
      if (!storage?.getDirectory) {
        return null
      }
      return storage.getDirectory()
    },
  }
}

export async function listModelFiles(
  deps: OpfsModelStoreDeps = createDefaultDeps()
): Promise<ModelStorageEntry[]> {
  const root = await deps.getRoot().catch(() => null)
  if (!root) {
    return []
  }
  const entries: ModelStorageEntry[] = []
  for await (const [name, handle] of root.entries()) {
    if (handle.kind !== 'file') {
      continue
    }
    try {
      const file = await (handle as FileSystemFileHandle).getFile()
      entries.push({ id: name, sizeBytes: file.size })
    } catch {
      // A file locked mid-download (or otherwise unreadable) should not break
      // listing the rest.
    }
  }
  return entries
}

export async function deleteModelFile(
  id: string,
  deps: OpfsModelStoreDeps = createDefaultDeps()
): Promise<void> {
  const root = await deps.getRoot().catch(() => null)
  if (!root) {
    return
  }
  await root.removeEntry(id).catch(() => undefined)
}
