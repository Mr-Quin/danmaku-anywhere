// for when the response is not in the expected format
// possibly due to an API change
export class ResponseParseException extends Error {
  constructor(message = 'Failed to parse response, the API may have changed') {
    super(message)
  }
}
