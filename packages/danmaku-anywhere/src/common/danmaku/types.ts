import type { ZodError } from 'zod'

export interface DanmakuFetchOptions {
  forceUpdate?: boolean // force update danmaku from server even if it's already in db
}

export interface ImportParseResult<T> {
  successCount: number
  succeeded: T
  errorCount: number
  errors: ZodError[]
}
