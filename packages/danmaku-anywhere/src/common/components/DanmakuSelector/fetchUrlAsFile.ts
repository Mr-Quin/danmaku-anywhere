import { AppError } from '@/common/errors/AppError'
import {
  classifyFetchRejection,
  fetchOrThrow,
} from '@/common/errors/fetchFailure'

type ImportUrlProblem =
  | 'importUrl.invalidUrl'
  | 'importUrl.invalidScheme'
  | 'importUrl.unsupportedExtension'

const SUPPORTED_EXTENSIONS = ['.json', '.xml', '.bin', '.zip'] as const
type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number]

const DEFAULT_MAX_BYTES = 500 * 1024 * 1024

export type ValidateImportUrlResult =
  | { ok: true; filename: string; extension: SupportedExtension }
  | {
      ok: false
      reason: ImportUrlProblem
    }

export function validateImportUrl(rawUrl: string): ValidateImportUrlResult {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'importUrl.invalidUrl' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'importUrl.invalidScheme' }
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(parsed.pathname)
  } catch {
    return { ok: false, reason: 'importUrl.invalidUrl' }
  }

  const lastSlash = decodedPath.lastIndexOf('/')
  const basename =
    lastSlash === -1 ? decodedPath : decodedPath.slice(lastSlash + 1)

  if (basename === '' || basename === '.') {
    return { ok: false, reason: 'importUrl.unsupportedExtension' }
  }

  const lowerBasename = basename.toLowerCase()
  const extension = SUPPORTED_EXTENSIONS.find((ext) =>
    lowerBasename.endsWith(ext)
  )
  if (!extension) {
    return { ok: false, reason: 'importUrl.unsupportedExtension' }
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
    throw new AppError(validation.reason)
  }

  const { signal } = options
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES

  const response = await fetchOrThrow(rawUrl, {
    credentials: 'omit',
    redirect: 'follow',
    cache: 'no-store',
    signal,
  })

  const chunks = await readBodyWithCap(response, maxBytes, signal)

  // Hand chunks straight to File — pre-merging into one ArrayBuffer here
  // would double peak memory near maxBytes.
  return new File(chunks as BlobPart[], validation.filename, {
    type: contentTypeFor(validation.extension),
  })
}

async function readBodyWithCap(
  response: Response,
  maxBytes: number,
  signal: AbortSignal | undefined
): Promise<Uint8Array[]> {
  if (!response.body) {
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > maxBytes) {
      throw new AppError('importUrl.tooLarge', { limit: formatBytes(maxBytes) })
    }
    return [new Uint8Array(buffer)]
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
          throw new AppError('importUrl.tooLarge', {
            limit: formatBytes(maxBytes),
          })
        }
        chunks.push(value)
      }
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err
    }
    throw classifyFetchRejection(err, signal)
  }

  return chunks
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (Number.isInteger(mb)) {
    return `${mb} MB`
  }
  return `${mb.toFixed(1)} MB`
}
