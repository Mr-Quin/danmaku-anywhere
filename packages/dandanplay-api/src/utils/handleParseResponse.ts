import { ResponseParseException } from '../exceptions/ResponseParseException'

export const handleParseResponse = <T>(parser: () => T): T => {
  try {
    return parser()
  } catch (e) {
    console.error(e)
    throw new ResponseParseException()
  }
}
