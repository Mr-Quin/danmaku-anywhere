import type { ZodType, z } from 'zod'

import { HttpException } from '../../exceptions/HttpException.js'
import { getApiStore } from '../../shared/store.js'
import { handleParseResponse } from './index.js'

export interface FetchOptions<T extends ZodType> {
  url: string
  method?: 'GET' | 'POST'
  query?: Record<string, unknown>
  body?: Record<string, unknown>
  requestSchema?: {
    body?: ZodType
    query?: ZodType
  }
  responseSchema: T
  headers?: Record<string, string> // Add headers property
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

export const fetchData = async <OutSchema extends ZodType>(
  options: FetchOptions<OutSchema>
): Promise<z.output<OutSchema>> => {
  const validatedOptions = validateRequest(options)

  const {
    url,
    method = 'GET',
    body,
    responseSchema,
    headers = {},
  } = validatedOptions

  const finalUrl = createUrl(url, validatedOptions.query)

  const store = getApiStore()

  // inject version header
  if (store.daVersion && url.startsWith(store.baseUrl)) {
    headers['DA-Version'] = store.daVersion
  }

  // add additional headers from the store
  if (store.headers) {
    Object.entries(store.headers).forEach(([key, value]) => {
      headers[key] = value
    })
  }

  const res = await fetch(finalUrl, {
    headers: { ...headers },
    method,
    body: body ? JSON.stringify(body) : undefined,
  })

  const getErrorMessage = async () => {
    if (res.headers.has('X-Error-Message')) {
      return res.headers.get('X-Error-Message')
    }
    return res.text()
  }

  if (res.status >= 400) {
    const errorMessage = await getErrorMessage()

    throw new HttpException(
      `Request failed with status ${res.status}: ${res.statusText}
      ${errorMessage}`,
      res.status,
      res.statusText
    )
  }

  const json: unknown = await res.json()
  return handleParseResponse(() => responseSchema.parse(json))
}
