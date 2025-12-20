import type { NotPromise } from '@/common/types/utils'

// golang style error handling
export async function tryCatch<T>(fn: () => Promise<T>) {
  try {
    return [await fn(), null] as const
  } catch (e) {
    if (!(e instanceof Error)) {
      return [null, new Error('Unknown error')] as const
    }
    return [null, e as Error] as const
  }
}

export function tryCatchSync<T>(fn: () => NotPromise<T>) {
  try {
    return [fn(), null] as const
  } catch (e) {
    if (!(e instanceof Error)) {
      return [null, new Error('Unknown error')] as const
    }
    return [null, e as Error] as const
  }
}
