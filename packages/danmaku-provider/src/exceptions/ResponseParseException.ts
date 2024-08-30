// for when the response is not in the expected format
// possibly due to an API change
export class ResponseParseException extends Error {
  public isZodError: boolean

  constructor({
    message = defaultErrorMessage,
    cause,
    isZodError = false,
  }: {
    message?: string
    cause?: unknown
    isZodError?: boolean
  } = {}) {
    super(message, { cause })
    this.isZodError = isZodError
  }
}

const defaultErrorMessage = 'Failed to parse response, the API may have changed'
