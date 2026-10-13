import { AppError, type ErrorTarget } from './AppError'

function isTimeout(reason: unknown): boolean {
  return reason instanceof DOMException && reason.name === 'TimeoutError'
}

// For a rejected fetch(). An aborted signal decides between timeout and abort,
// because the rejection itself is whatever the platform throws.
export function classifyFetchRejection(
  error: unknown,
  signal?: AbortSignal | null,
  target?: ErrorTarget
): AppError<'network' | 'timeout' | 'aborted'> {
  if (signal?.aborted) {
    if (isTimeout(signal.reason)) {
      return new AppError('timeout', { target }, { cause: error })
    }
    return new AppError('aborted', {}, { cause: error })
  }
  return new AppError('network', { target }, { cause: error })
}
