import { BiliBiliApiException } from './exceptions.js'
import type { BilibiliApiResponseBase } from './schema.js'

export function ensureData<
  T extends BilibiliApiResponseBase,
  K extends keyof T,
>(data: T, key: K): asserts data is T & { [key in K]-?: NonNullable<T[key]> } {
  if (data.code !== 0 || !data[key]) {
    throw new BiliBiliApiException(data.message, data.code)
  }
}
