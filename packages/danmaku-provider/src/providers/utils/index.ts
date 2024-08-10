import { ZodError } from 'zod'

import { ResponseParseException } from '../../exceptions/ResponseParseException.js'

export const handleParseResponse = <T>(parser: () => T): T => {
  try {
    return parser()
  } catch (e) {
    console.error(e)
    if (e instanceof ZodError) {
      console.error(e.toString())
    }
    // import.meta.env.NODE_ENV === 'test'
    throw new ResponseParseException()
  }
}

export const handleParseResponseAsync = async <T>(
  parser: () => Promise<T>
): Promise<T> => {
  try {
    return await parser()
  } catch (e) {
    // import.meta.env.NODE_ENV === 'test'
    console.error(e)
    if (e instanceof ZodError) {
      console.error(e.toString())
    }
    throw new ResponseParseException()
  }
}
