import type { TencentApiResponseBase } from './schema.js'
import { TencentException } from './TencentException.js'

export function ensureData<T extends TencentApiResponseBase, K extends keyof T>(
  data: T,
  key: K,
  errorMsg?: string
): asserts data is T & { [key in K]-?: NonNullable<T[key]> } {
  if (data.ret !== 0 || !data[key]) {
    throw new TencentException(errorMsg ?? data.msg, data.ret)
  }
}
