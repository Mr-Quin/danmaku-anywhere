// for when the response is not in the expected format
// possibly due to an API change
import { DanmakuProviderError } from './BaseError.js'

// for when the response is not in the expected format
// possibly due to an API change
export class ResponseParseException extends DanmakuProviderError {
  public isZodError: boolean

  constructor({
    message = defaultErrorMessage,
    cause,
    isZodError = false,
    url,
    responseBody,
  }: {
    message?: string
    cause?: unknown
    isZodError?: boolean
    url?: string
    responseBody?: unknown
  } = {}) {
    super(message)
    this.cause = cause
    this.isZodError = isZodError
    this.url = url
    this.responseBody = responseBody
  }
}

const defaultErrorMessage = 'Failed to parse response, the API may have changed'
