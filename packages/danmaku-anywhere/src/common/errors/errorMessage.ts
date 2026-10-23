import { isErrorLike } from './isErrorLike'

// For logs and diagnostics. User-facing text comes from describeError.
export function errorMessage(error: unknown): string {
  if (isErrorLike(error)) {
    return error.message
  }
  return String(error)
}
