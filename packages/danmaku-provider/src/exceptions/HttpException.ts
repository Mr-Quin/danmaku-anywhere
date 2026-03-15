import { DanmakuProviderError } from './BaseError'

export class HttpException extends DanmakuProviderError {
  public statusText: string

  constructor(
    message: string,
    status: number,
    statusText: string,
    url?: string,
    responseBody?: unknown
  ) {
    super(message)
    this.status = status
    this.statusText = statusText
    this.url = url
    this.responseBody = responseBody
  }
}
