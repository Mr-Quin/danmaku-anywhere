import { ZodError } from 'zod'

import { ResponseParseException } from '../../exceptions/ResponseParseException.js'

export const handleParseResponse = <T>(parser: () => T): T => {
  try {
    return parser()
  } catch (e) {
    throw new ResponseParseException({
      cause: e,
      isZodError: e instanceof ZodError,
    })
  }
}

export const handleParseResponseAsync = async <T>(
  parser: () => Promise<T>
): Promise<T> => {
  try {
    return await parser()
  } catch (e) {
    throw new ResponseParseException({
      cause: e,
      isZodError: e instanceof ZodError,
    })
  }
}
