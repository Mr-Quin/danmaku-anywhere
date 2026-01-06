import { err, ok, type Result } from '@danmaku-anywhere/result'
import { TencentApiException } from './exceptions.js'
import type { TencentApiResponseBase } from './schema.js'

export function validateTencentResponse<T extends TencentApiResponseBase>(
  data: T,
  response: Response
): Result<T, TencentApiException> {
  if (data.ret !== 0) {
    const { errorMsg, retCode } = parseHeader(response)

    const cookie = retCode === -1100001

    return err(
      new TencentApiException(errorMsg ?? data.msg, retCode ?? data.ret, cookie)
    )
  }
  return ok(data)
}

export function ensureData<T extends TencentApiResponseBase, K extends keyof T>(
  data: T,
  key: K
): Result<NonNullable<T[K]>, TencentApiException> {
  if (data.ret !== 0 || !data[key]) {
    return err(new TencentApiException(data.msg))
  }
  return ok(data[key] as NonNullable<T[K]>)
}

export const parseHeader = (response: Response) => {
  const errorMsg = response.headers.get('Trpc-Error-Msg') || undefined
  const retCode = response.headers.get('trpc-func-ret')

  return { errorMsg, retCode: retCode ? Number.parseInt(retCode) : undefined }
}
