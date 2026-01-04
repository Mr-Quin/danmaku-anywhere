import { err, ok, type Result } from '@danmaku-anywhere/result'
import type { DanmakuProviderError } from '../../exceptions/BaseError.js'
import { BiliBiliApiException } from './exceptions.js'
import type { BilibiliApiResponseBase } from './schema.js'

export function ensureSelectData<
  T extends BilibiliApiResponseBase,
  K extends keyof T,
  R,
>(
  data: T,
  key: K,
  selectResult: (data: NonNullable<T[K]>) => R
): Result<R, DanmakuProviderError> {
  if (data.code !== 0 || !data[key]) {
    const exception = new BiliBiliApiException(data.message, data.code)
    return err(exception)
  }
  return ok(selectResult(data[key]))
}
