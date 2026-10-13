import { AppError } from './AppError'

function isTimeout(reason: unknown): boolean {
  return reason instanceof DOMException && reason.name === 'TimeoutError'
}

// For a rejected fetch(). An aborted signal decides between timeout and abort,
// because the rejection itself is whatever the platform throws.
export function classifyFetchRejection(
  error: unknown,
  signal?: AbortSignal | null
): AppError<'network' | 'timeout' | 'aborted'> {
  if (signal?.aborted) {
    if (isTimeout(signal.reason)) {
      return new AppError('timeout', {}, { cause: error })
    }
    return new AppError('aborted', {}, { cause: error })
  }
  return new AppError('network', {}, { cause: error })
}
