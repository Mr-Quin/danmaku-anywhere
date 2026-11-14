import {
  type KazumiManifest,
  type KazumiPolicy,
  zKazumiManifest,
  zKazumiPolicy,
} from '@danmaku-anywhere/extension-protocol'
import { type ZodType, z } from 'zod'

interface KazumiApiErrorDetails {
  url: string
  status?: number
  statusText?: string
  responseBody?: unknown
  cause?: unknown
}

class KazumiApiError extends Error {
  readonly url: string
  readonly status?: number
  readonly statusText?: string
  readonly responseBody?: unknown

  constructor(message: string, details: KazumiApiErrorDetails) {
    super(message, { cause: details.cause })
    this.name = 'KazumiApiError'
    this.url = details.url
    this.status = details.status
    this.statusText = details.statusText
    this.responseBody = details.responseBody
  }
}

export type KazumiApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: KazumiApiError }

function failure(error: KazumiApiError): KazumiApiResult<never> {
  return { success: false, error }
}

async function getJson<S extends ZodType>(
  url: string,
  schema: S
): Promise<KazumiApiResult<z.output<S>>> {
  try {
    const res = await fetch(url, { method: 'GET' })

    if (res.status >= 400) {
      const responseBody = await res.clone().text()
      const errorMessage = res.headers.get('X-Error-Message') || res.statusText
      return failure(
        new KazumiApiError(
          `Request failed with status ${res.status}: ${res.statusText} ${errorMessage}`,
          {
            url,
            status: res.status,
            statusText: res.statusText,
            responseBody,
          }
        )
      )
    }

    const json: unknown = await res.json()

    let parsed: z.ZodSafeParseResult<z.output<S>>
    try {
      parsed = await schema.safeParseAsync(json)
    } catch (e) {
      return failure(
        new KazumiApiError('Unexpected error when parsing response', {
          url,
          responseBody: json,
          cause: e,
        })
      )
    }

    if (!parsed.success) {
      return failure(
        new KazumiApiError('Schema validation failed', {
          url,
          responseBody: json,
          cause: parsed.error,
        })
      )
    }

    return { success: true, data: parsed.data }
  } catch (e) {
    return failure(
      new KazumiApiError(e instanceof Error ? e.message : String(e), {
        url,
        status: 0,
        statusText: 'Network Error',
      })
    )
  }
}

export function getManifest(
  baseUrl: string
): Promise<KazumiApiResult<KazumiManifest[]>> {
  return getJson(`${baseUrl}/kazumi/rules`, z.array(zKazumiManifest))
}

export function getPolicy(
  baseUrl: string,
  fileName: string
): Promise<KazumiApiResult<KazumiPolicy>> {
  const query = new URLSearchParams({ file: fileName })
  return getJson(`${baseUrl}/kazumi/rules/file?${query}`, zKazumiPolicy)
}
