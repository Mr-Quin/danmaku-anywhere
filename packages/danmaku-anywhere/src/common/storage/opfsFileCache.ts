export interface DownloadProgress {
  loaded: number
  /** Null when the server omits Content-Length. */
  total: number | null
}

export interface FetchAndCacheOptions {
  /** Stable id; used as the OPFS file name. */
  id: string
  url: string
  /** Lowercase hex sha256; when set, cached and fetched bytes are verified. */
  sha256?: string
  onProgress?: (progress: DownloadProgress) => void
  signal?: AbortSignal
}

export interface CachedFileInfo {
  /** The cache id (OPFS file name). */
  id: string
  sizeBytes: number
}

/** Minimal OPFS surface used by the cache; tests inject a fake. */
export interface OpfsAdapter {
  read(name: string): Promise<ArrayBuffer | null>
  write(name: string, bytes: ArrayBuffer): Promise<void>
  remove(name: string): Promise<void>
  list(): Promise<CachedFileInfo[]>
}

export interface OpfsFileCacheDeps {
  /** Null when OPFS is unavailable in this context. */
  opfs: OpfsAdapter | null
  fetch: typeof fetch
  digest: (bytes: ArrayBuffer) => Promise<string>
  requestPersistence: () => Promise<boolean>
}

const LOG_PREFIX = '[opfsFileCache]'

let warnedOpfsUnavailable = false

function warnOpfsUnavailableOnce(reason: unknown): void {
  if (warnedOpfsUnavailable) {
    return
  }
  warnedOpfsUnavailable = true
  console.warn(`${LOG_PREFIX}: OPFS unavailable, caching disabled`, reason)
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex
}

async function defaultDigest(bytes: ArrayBuffer): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('crypto.subtle is unavailable')
  }
  const hash = await subtle.digest('SHA-256', bytes)
  return toHex(hash)
}

async function defaultRequestPersistence(): Promise<boolean> {
  const storage = globalThis.navigator?.storage
  if (!storage?.persist) {
    return false
  }
  try {
    return await storage.persist()
  } catch {
    return false
  }
}

function createNavigatorOpfs(): OpfsAdapter | null {
  const storage = globalThis.navigator?.storage
  if (!storage?.getDirectory) {
    return null
  }

  async function getRoot(): Promise<FileSystemDirectoryHandle> {
    return storage.getDirectory()
  }

  return {
    async read(name) {
      try {
        const root = await getRoot()
        const handle = await root.getFileHandle(name)
        const file = await handle.getFile()
        return await file.arrayBuffer()
      } catch {
        return null
      }
    },
    async write(name, bytes) {
      const root = await getRoot()
      const handle = await root.getFileHandle(name, { create: true })
      const writable = await handle.createWritable()
      try {
        await writable.write(bytes)
      } finally {
        await writable.close()
      }
    },
    async remove(name) {
      try {
        const root = await getRoot()
        await root.removeEntry(name)
      } catch {
        // A missing entry is the desired post-state, so treat removal as done.
      }
    },
    async list() {
      const root = await getRoot()
      const entries: CachedFileInfo[] = []
      for await (const [name, handle] of root.entries()) {
        if (handle.kind !== 'file') {
          continue
        }
        try {
          const file = await (handle as FileSystemFileHandle).getFile()
          entries.push({ id: name, sizeBytes: file.size })
        } catch {
          // A file locked mid-download (or otherwise unreadable) should not
          // break listing the rest.
        }
      }
      return entries
    },
  }
}

function createDefaultDeps(): OpfsFileCacheDeps {
  let opfs: OpfsAdapter | null = null
  try {
    opfs = createNavigatorOpfs()
  } catch (reason) {
    warnOpfsUnavailableOnce(reason)
  }
  if (!opfs) {
    warnOpfsUnavailableOnce(new Error('navigator.storage.getDirectory missing'))
  }
  return {
    opfs,
    fetch: globalThis.fetch.bind(globalThis),
    digest: defaultDigest,
    requestPersistence: defaultRequestPersistence,
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}

async function readResponseBytes(
  response: Response,
  onProgress: ((progress: DownloadProgress) => void) | undefined,
  signal: AbortSignal | undefined
): Promise<ArrayBuffer> {
  const header = response.headers?.get('content-length')
  const parsed = header ? Number.parseInt(header, 10) : null
  const total = Number.isFinite(parsed) ? parsed : null

  const body = response.body
  if (!body || typeof body.getReader !== 'function') {
    const buffer = await response.arrayBuffer()
    onProgress?.({ loaded: buffer.byteLength, total })
    return buffer
  }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  try {
    while (true) {
      throwIfAborted(signal)
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (value) {
        chunks.push(value)
        loaded += value.byteLength
        onProgress?.({ loaded, total })
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  }

  const merged = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged.buffer
}

async function matchesIntegrity(
  bytes: ArrayBuffer,
  sha256: string | undefined,
  digest: (bytes: ArrayBuffer) => Promise<string>
): Promise<boolean> {
  if (!sha256) {
    return true
  }
  const actual = await digest(bytes)
  return actual.toLowerCase() === sha256.toLowerCase()
}

async function downloadAndVerify(
  options: FetchAndCacheOptions,
  deps: OpfsFileCacheDeps
): Promise<ArrayBuffer> {
  throwIfAborted(options.signal)
  const response = await deps.fetch(options.url, { signal: options.signal })
  if (!response.ok) {
    throw new Error(
      `${LOG_PREFIX}: fetch failed for ${options.id} (${response.status})`
    )
  }
  const bytes = await readResponseBytes(
    response,
    options.onProgress,
    options.signal
  )
  const ok = await matchesIntegrity(bytes, options.sha256, deps.digest)
  if (!ok) {
    throw new Error(`${LOG_PREFIX}: integrity check failed for ${options.id}`)
  }
  return bytes
}

/**
 * Fetch a large file by id, using OPFS as a persistent cache. A verified cache
 * hit skips the network; a miss, partial, or integrity mismatch re-downloads,
 * verifies, and writes back. Falls back to a plain fetch (no caching) when OPFS
 * is unavailable. Runs in a Window or Worker context.
 */
export async function fetchAndCacheFile(
  options: FetchAndCacheOptions,
  deps: OpfsFileCacheDeps = createDefaultDeps()
): Promise<ArrayBuffer> {
  const { opfs } = deps

  if (!opfs) {
    warnOpfsUnavailableOnce(new Error('no OPFS adapter'))
    return downloadAndVerify(options, deps)
  }

  const cached = await opfs.read(options.id).catch(() => null)
  if (cached && cached.byteLength > 0) {
    const ok = await matchesIntegrity(cached, options.sha256, deps.digest)
    if (ok) {
      // No onProgress on a cache hit: it serves instantly, so reporting progress
      // would surface a misleading "downloading" notice.
      return cached
    }
    await opfs.remove(options.id).catch(() => undefined)
  }

  const bytes = await downloadAndVerify(options, deps)
  void deps.requestPersistence()
  await opfs.write(options.id, bytes).catch((reason) => {
    warnOpfsUnavailableOnce(reason)
  })
  return bytes
}

/**
 * Lists the files currently cached in OPFS (id + size). Returns an empty list
 * when OPFS is unavailable. Runs in an extension-origin context that shares the
 * one unpartitioned OPFS root, so it sees exactly the files fetchAndCacheFile
 * wrote from any such context.
 */
export async function listCachedFiles(
  deps: OpfsFileCacheDeps = createDefaultDeps()
): Promise<CachedFileInfo[]> {
  if (!deps.opfs) {
    return []
  }
  return deps.opfs.list().catch(() => [])
}

/** Evicts a cached file by id; a no-op when OPFS is unavailable or absent. */
export async function removeCachedFile(
  id: string,
  deps: OpfsFileCacheDeps = createDefaultDeps()
): Promise<void> {
  await deps.opfs?.remove(id).catch(() => undefined)
}

/** Test-only: resets the "log once" latch between cases. */
export function resetOpfsFileCacheWarnings(): void {
  warnedOpfsUnavailable = false
}
