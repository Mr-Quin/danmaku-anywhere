import crypto from 'crypto'

export const uriDecode = (url: string) => {
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

export const sha256 = (message: string) => {
  return crypto.createHash('sha256').update(message).digest('hex')
}

export const md5 = (message: string) => {
  return crypto.createHash('md5').update(message).digest('hex')
}

// https://developers.cloudflare.com/workers/examples/cache-post-request/
export const getCacheKey = (request: Request, env: Env, message: string) => {
  const hash = sha256(message)
  const cacheUrl = new URL(request.url)

  cacheUrl.pathname = cacheUrl.pathname + hash

  const cacheKey = new Request(cacheUrl.toString(), {
    headers: request.headers,
    method: 'GET',
  })

  return cacheKey
}

export class HTTPError {
  readonly _tag = 'HTTPError'

  constructor(
    readonly status: number,
    readonly message: string
  ) {}
}
