import {
  HttpException,
  ResponseParseException,
} from '@danmaku-anywhere/danmaku-provider'
import {
  AbortedError,
  Base64DecodeError,
  HostNotAllowedError,
  HttpStatusError,
  JsonataTimeoutError,
  NetworkError,
} from '@mr-quin/dango'
import {
  AppError,
  type ErrorTarget,
  type SourceRef,
} from '@/common/errors/AppError'

// Errors a manifest run throws, coded for the user. Anything else is a bug in
// the engine or the manifest and stays as it is for the log.
export function fromDangoError(error: unknown, source: SourceRef): unknown {
  if (error instanceof AppError) {
    return error
  }
  const target: ErrorTarget = { kind: 'source', ref: source }
  if (error instanceof NetworkError) {
    return new AppError('network', { target }, { cause: error })
  }
  if (error instanceof HttpStatusError) {
    return new AppError(
      'http',
      { status: error.status, target },
      { cause: error }
    )
  }
  if (error instanceof HostNotAllowedError) {
    return new AppError('hostNotAllowed', { source }, { cause: error })
  }
  if (error instanceof AbortedError) {
    return new AppError('aborted', {}, { cause: error })
  }
  if (
    error instanceof JsonataTimeoutError ||
    error instanceof Base64DecodeError
  ) {
    return new AppError('badResponse', { target }, { cause: error })
  }
  return error
}

// danmaku-provider reports a failed fetch() as an HttpException with status 0.
export function fromProviderApiError(
  error: unknown,
  target?: ErrorTarget
): unknown {
  if (error instanceof HttpException) {
    if (error.status === undefined || error.status === 0) {
      return new AppError('network', { target }, { cause: error })
    }
    return new AppError(
      'http',
      { status: error.status, target },
      { cause: error }
    )
  }
  if (error instanceof ResponseParseException) {
    return new AppError('badResponse', { target }, { cause: error })
  }
  return error
}
