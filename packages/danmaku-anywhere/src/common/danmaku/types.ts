import type { ZodError } from 'zod'

export interface ImportParseResult<T> {
  successCount: number
  succeeded: T
  errorCount: number
  errors: ZodError[]
}
