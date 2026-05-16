export type ImportFromUrlErrorCode =
  | 'invalidUrl'
  | 'invalidScheme'
  | 'unsupportedExtension'
  | 'fetchFailed'
  | 'httpError'
  | 'sizeLimitExceeded'
  | 'aborted'

export class ImportFromUrlError extends Error {
  readonly code: ImportFromUrlErrorCode
  readonly params: Record<string, string | number>

  constructor(
    code: ImportFromUrlErrorCode,
    params: Record<string, string | number> = {}
  ) {
    super(code)
    this.name = 'ImportFromUrlError'
    this.code = code
    this.params = params
  }
}

const SUPPORTED_EXTENSIONS = ['.json', '.xml', '.bin', '.zip'] as const
type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number]

const DEFAULT_MAX_BYTES = 500 * 1024 * 1024

export type ValidateImportUrlResult =
  | { ok: true; filename: string; extension: SupportedExtension }
  | {
      ok: false
      reason: Extract<
        ImportFromUrlErrorCode,
        'invalidUrl' | 'invalidScheme' | 'unsupportedExtension'
      >
    }

export function validateImportUrl(rawUrl: string): ValidateImportUrlResult {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'invalidUrl' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'invalidScheme' }
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(parsed.pathname)
  } catch {
    return { ok: false, reason: 'invalidUrl' }
  }

  const lastSlash = decodedPath.lastIndexOf('/')
  const basename =
    lastSlash === -1 ? decodedPath : decodedPath.slice(lastSlash + 1)

  if (basename === '' || basename === '.') {
    return { ok: false, reason: 'unsupportedExtension' }
  }

  const lowerBasename = basename.toLowerCase()
  const extension = SUPPORTED_EXTENSIONS.find((ext) =>
    lowerBasename.endsWith(ext)
  )
  if (!extension) {
    return { ok: false, reason: 'unsupportedExtension' }
  }

  return { ok: true, filename: basename, extension }
}

function contentTypeFor(extension: SupportedExtension): string {
  switch (extension) {
    case '.xml':
      return 'text/xml'
    case '.bin':
      return 'application/octet-stream'
    case '.zip':
      return 'application/zip'
    default:
      return 'application/json'
  }
}

export type FetchUrlAsFileOptions = {
  maxBytes?: number
  signal?: AbortSignal
}

export async function fetchUrlAsFile(
  rawUrl: string,
  options: FetchUrlAsFileOptions = {}
): Promise<File> {
  const validation = validateImportUrl(rawUrl)
  if (!validation.ok) {
    throw new ImportFromUrlError(validation.reason)
  }

  const { signal } = options
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES

  let response: Response
  try {
    response = await fetch(rawUrl, {
      credentials: 'omit',
      redirect: 'follow',
      cache: 'no-store',
      signal,
    })
  } catch (err) {
    if (
      signal?.aborted ||
      (err instanceof Error && err.name === 'AbortError')
    ) {
      throw new ImportFromUrlError('aborted')
    }
    throw new ImportFromUrlError('fetchFailed')
  }

  if (!response.ok) {
    throw new ImportFromUrlError('httpError', { status: response.status })
  }

  const buffer = await readBodyWithCap(response, maxBytes, signal)

  return new File([buffer], validation.filename, {
    type: contentTypeFor(validation.extension),
  })
}

async function readBodyWithCap(
  response: Response,
  maxBytes: number,
  signal: AbortSignal | undefined
): Promise<ArrayBuffer> {
  if (!response.body) {
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > maxBytes) {
      throw new ImportFromUrlError('sizeLimitExceeded', {
        limit: formatBytes(maxBytes),
      })
    }
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (value) {
        total += value.byteLength
        if (total > maxBytes) {
          await reader.cancel()
          throw new ImportFromUrlError('sizeLimitExceeded', {
            limit: formatBytes(maxBytes),
          })
        }
        chunks.push(value)
      }
    }
  } catch (err) {
    if (err instanceof ImportFromUrlError) {
      throw err
    }
    if (
      signal?.aborted ||
      (err instanceof Error && err.name === 'AbortError')
    ) {
      throw new ImportFromUrlError('aborted')
    }
    throw new ImportFromUrlError('fetchFailed')
  }

  const merged = new ArrayBuffer(total)
  const view = new Uint8Array(merged)
  let offset = 0
  for (const chunk of chunks) {
    view.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (Number.isInteger(mb)) {
    return `${mb} MB`
  }
  return `${mb.toFixed(1)} MB`
}
