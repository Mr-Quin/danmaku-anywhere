/**
 * OPFS-backed cache for large segmentation model files.
 *
 * Fetches a model by id from a remote URL (streaming, with progress), verifies
 * its integrity against an optional sha256, persists the bytes in the origin
 * private file system, and serves them from there on subsequent calls. Built to
 * run in a Window OR Worker context (the segmenter iframe), with the OPFS layer
 * behind a small interface so it can be faked in tests.
 */

export interface ModelCacheProgress {
  /** Bytes received so far. */
  loaded: number
  /** Total bytes expected, or null when the server omits Content-Length. */
  total: number | null
}

export interface FetchModelOptions {
  /** Stable identifier; becomes the OPFS file name. */
  id: string
  /** Remote location to fetch from on a cache miss. */
  url: string
  /** Lowercase hex sha256. When set, cached and fetched bytes are verified. */
  sha256?: string
  /** Receives streaming download progress. */
  onProgress?: (progress: ModelCacheProgress) => void
  /** Cancels an in-flight fetch (does not affect an OPFS cache hit). */
  signal?: AbortSignal
}

/**
 * Minimal OPFS surface used by the cache. The default implementation wraps
 * navigator.storage; tests inject a fake.
 */
export interface OpfsAdapter {
  read(name: string): Promise<ArrayBuffer | null>
  write(name: string, bytes: ArrayBuffer): Promise<void>
  remove(name: string): Promise<void>
}

export interface ModelCacheDeps {
  /** OPFS access, or null when OPFS is unavailable in this context. */
  opfs: OpfsAdapter | null
  fetch: typeof fetch
  digest: (bytes: ArrayBuffer) => Promise<string>
  /** Best-effort persistence request; resolves to whether storage is persisted. */
  requestPersistence: () => Promise<boolean>
}

const LOG_PREFIX = '[occlusion] modelCache'

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
        // Nothing to remove; treat as success.
      }
    },
  }
}

function createDefaultDeps(): ModelCacheDeps {
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
  onProgress: ((progress: ModelCacheProgress) => void) | undefined,
  signal: AbortSignal | undefined
): Promise<ArrayBuffer> {
  const header = response.headers?.get('content-length')
  const parsed = header ? Number.parseInt(header, 10) : null
  const total = parsed !== null && Number.isFinite(parsed) ? parsed : null

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
  options: FetchModelOptions,
  deps: ModelCacheDeps
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
 * Returns the model bytes, using OPFS as a persistent cache when available.
 *
 * On a verified cache hit, no network request is made. On a miss, a partial
 * cache, or an integrity mismatch, the model is re-downloaded, verified, and
 * written back. When OPFS is unavailable, falls back to a plain fetch with no
 * caching and logs once.
 */
export async function fetchModelWithCache(
  options: FetchModelOptions,
  deps: ModelCacheDeps = createDefaultDeps()
): Promise<ArrayBuffer> {
  const { opfs } = deps

  if (!opfs) {
    warnOpfsUnavailableOnce(new Error('no OPFS adapter'))
    return downloadAndVerify(options, deps)
  }

  void deps.requestPersistence()

  const cached = await opfs.read(options.id).catch(() => null)
  if (cached && cached.byteLength > 0) {
    const ok = await matchesIntegrity(cached, options.sha256, deps.digest)
    if (ok) {
      options.onProgress?.({
        loaded: cached.byteLength,
        total: cached.byteLength,
      })
      return cached
    }
    await opfs.remove(options.id).catch(() => undefined)
  }

  const bytes = await downloadAndVerify(options, deps)
  await opfs.write(options.id, bytes).catch((reason) => {
    warnOpfsUnavailableOnce(reason)
  })
  return bytes
}

/** Test-only: resets the "log once" latch between cases. */
export function resetModelCacheWarnings(): void {
  warnedOpfsUnavailable = false
}
