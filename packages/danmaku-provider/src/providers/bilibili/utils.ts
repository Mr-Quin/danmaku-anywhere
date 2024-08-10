import { BiliBiliException } from './BiliBiliException.js'
import type { BilibiliApiResponseBase } from './schema.js'

export function ensureData<
  T extends BilibiliApiResponseBase,
  K extends keyof T,
>(data: T, key: K): asserts data is T & { [key in K]-?: NonNullable<T[key]> } {
  if (data.code !== 0 || !data[key]) {
    throw new BiliBiliException(data.message, data.code)
  }
}
