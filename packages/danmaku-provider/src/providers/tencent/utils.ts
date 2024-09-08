import { TencentApiException } from './exceptions.js'
import type { TencentApiResponseBase } from './schema.js'

export function ensureData<T extends TencentApiResponseBase, K extends keyof T>(
  data: T,
  key: K,
  response?: Response
): asserts data is T & { [key in K]-?: NonNullable<T[key]> } {
  if (data.ret !== 0 || !data[key]) {
    if (response) {
      const { errorMsg, retCode } = parseHeader(response)

      const cookie = retCode === -1100001

      throw new TencentApiException(
        errorMsg ?? data.msg,
        retCode ?? data.ret,
        cookie
      )
    }

    throw new TencentApiException(data.msg)
  }
}

export const parseHeader = (response: Response) => {
  const errorMsg = response.headers.get('Trpc-Error-Msg') || undefined
  const retCode = response.headers.get('trpc-func-ret')

  return { errorMsg, retCode: retCode ? parseInt(retCode) : undefined }
}
