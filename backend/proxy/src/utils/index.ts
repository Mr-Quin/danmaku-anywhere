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

export class HTTPError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'HTTPError'
  }
}

export const tryCatch = async <T>(fn: () => Promise<T>) => {
  try {
    return [await fn(), null] as const
  } catch (e) {
    if (!(e instanceof Error)) {
      return [null, new Error('Unknown error')] as const
    }
    return [null, e as Error] as const
  }
}
