import { ResponseParseException } from '../../exceptions/ResponseParseException.js'

export const handleParseResponse = <T>(parser: () => T): T => {
  try {
    return parser()
  } catch (e) {
    // import.meta.env.NODE_ENV === 'test'
    console.error(e)
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
    throw new ResponseParseException()
  }
}
