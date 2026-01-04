import { err, ok, type Result } from '@danmaku-anywhere/result'
import { ZodError } from 'zod'
import { ResponseParseException } from '../../exceptions/ResponseParseException.js'

export const handleParseResponse = <T>(
  parser: () => T,
  context?: { url?: string; responseBody?: unknown }
): Result<T, ResponseParseException> => {
  try {
    return ok(parser())
  } catch (e) {
    return err(
      new ResponseParseException({
        cause: e,
        isZodError: e instanceof ZodError,
        ...context,
      })
    )
  }
}

export const handleParseResponseAsync = async <T>(
  parser: () => Promise<T>,
  context?: { url?: string; responseBody?: unknown }
): Promise<Result<T, ResponseParseException>> => {
  try {
    return ok(await parser())
  } catch (e) {
    return err(
      new ResponseParseException({
        cause: e,
        isZodError: e instanceof ZodError,
        ...context,
      })
    )
  }
}
