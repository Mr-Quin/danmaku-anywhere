import { err, ok, type Result } from '@danmaku-anywhere/result'
import type { ZodType, z } from 'zod'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { HttpException } from '../../exceptions/HttpException.js'
import { ResponseParseException } from '../../exceptions/ResponseParseException.js'
import { getApiStore } from '../../shared/store.js'
import { handleParseResponseAsync } from './index.js'

export interface FetchOptions<T extends ZodType> {
  url: string
  method?: 'GET' | 'POST'
  query?: Record<string, unknown>
  body?: Record<string, unknown>
  requestSchema?: {
    body?: ZodType
    query?: ZodType
  }
  responseType?: 'json' | 'text'
  responseSchema: T
  headers?: Record<string, string>
  // if this request goes to the danmaku-anywhere backend
  isDaRequest?: boolean
  getErrorMessage?: (res: Response) => Promise<string | undefined>
}

const validateRequest = <T extends FetchOptions<any>>(options: T) => {
  const clone: T = { ...options }

  const { requestSchema, body, query } = clone

  if (requestSchema?.body) {
    clone.body = requestSchema.body.parse(body)
  }
  if (requestSchema?.query && query) {
    clone.query = requestSchema.query.parse(query)
  }

  return clone
}

const createUrl = (url: string, query?: Record<string, unknown>) => {
  if (!query) {
    return `${url}`
  }
  return `${url}?${new URLSearchParams(query as never)}`
}

function defaultGetErrorMessage(res: Response) {
  if (res.headers.has('X-Error-Message')) {
    return res.headers.get('X-Error-Message')
  }
}

export const fetchData = async <OutSchema extends ZodType>(
  options: FetchOptions<OutSchema>
): Promise<Result<z.output<OutSchema>, DanmakuProviderError>> => {
  const validatedOptions = validateRequest(options)

  const {
    url,
    method = 'GET',
    body,
    responseSchema,
    headers = {},
    getErrorMessage,
  } = validatedOptions

  const finalUrl = createUrl(url, validatedOptions.query)

  if (validatedOptions.isDaRequest) {
    const store = getApiStore()

    // inject version header
    if (store.daVersion && url.startsWith(store.baseUrl)) {
      headers['DA-Version'] = store.daVersion
    }
    if (store.daId && url.startsWith(store.baseUrl)) {
      headers['DA-extension-id'] = store.daId
    }

    // add additional headers from the store
    if (store.headers) {
      Object.entries(store.headers).forEach(([key, value]) => {
        headers[key] = value
      })
    }
  }

  try {
    const res = await fetch(finalUrl, {
      headers: { ...headers },
      method,
      body: body ? JSON.stringify(body) : undefined,
    })

    async function getError() {
      if (getErrorMessage) {
        return await getErrorMessage(res)
      }
      return defaultGetErrorMessage(res)
    }

    if (res.status >= 400) {
      const errorMessage = (await getError()) || res.statusText

      return err(
        new HttpException(
          `Request failed with status ${res.status}: ${res.statusText}
          ${errorMessage}`,
          res.status,
          res.statusText,
          finalUrl,
          errorMessage
        )
      )
    }

    const responseType = validatedOptions.responseType || 'json'
    const json: unknown = await res[responseType]()
    const parseResult = await handleParseResponseAsync(
      () => responseSchema.parseAsync(json),
      {
        url: finalUrl,
        responseBody: json,
      }
    )

    if (!parseResult.success) {
      return parseResult
    }

    return ok(parseResult.data)
  } catch (e) {
    if (e instanceof ResponseParseException) {
      return err(e)
    }

    // Network errors or other unexpected errors
    return err(
      new HttpException(
        e instanceof Error ? e.message : String(e),
        0,
        'Network Error',
        finalUrl
      )
    )
  }
}
