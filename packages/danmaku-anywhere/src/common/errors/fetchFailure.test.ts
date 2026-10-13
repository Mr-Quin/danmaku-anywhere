import { describe, expect, it } from 'vitest'
import { AppError } from './AppError'
import { classifyFetchRejection } from './fetchFailure'

describe('classifyFetchRejection', () => {
  it('codes a plain rejection as network and keeps it as cause', () => {
    const rejection = new TypeError('Failed to fetch')

    const error = classifyFetchRejection(rejection)

    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('network')
    expect(error.cause).toBe(rejection)
  })

  it('codes a rejection after AbortSignal.timeout as timeout', () => {
    const controller = new AbortController()
    controller.abort(new DOMException('signal timed out', 'TimeoutError'))

    const error = classifyFetchRejection(
      new DOMException('aborted', 'AbortError'),
      controller.signal
    )

    expect(error.code).toBe('timeout')
  })

  it('codes a rejection after a caller abort as aborted', () => {
    const controller = new AbortController()
    controller.abort()

    const error = classifyFetchRejection(
      new DOMException('aborted', 'AbortError'),
      controller.signal
    )

    expect(error.code).toBe('aborted')
  })
})
