import type { ZodSchema } from 'zod'

import { HttpException } from '../../exceptions/HttpException.js'

import { handleParseResponse } from './index.js'

export interface FetchOptions<T = unknown> {
  url: string
  method?: 'GET' | 'POST'
  query?: Record<string, unknown>
  body?: Record<string, unknown>
  requestSchema?: {
    body?: ZodSchema
    query?: ZodSchema
  }
  responseSchema: ZodSchema<T>
  headers?: Record<string, string> // Add headers property
}

const validateRequest = <T extends FetchOptions>(options: T) => {
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

export const fetchData = async <T extends object>(options: FetchOptions<T>) => {
  const validatedOptions = validateRequest(options)

  const {
    url,
    method = 'GET',
    body,
    responseSchema,
    headers = {},
  } = validatedOptions

  const finalUrl = createUrl(url, validatedOptions.query) // Always use DanDanPlay baseUrl

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
  const data = handleParseResponse(() => responseSchema.parse(json))

  return data
}
