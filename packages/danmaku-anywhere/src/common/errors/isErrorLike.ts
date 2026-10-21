// DOMException is not an Error subclass in every realm (jsdom, for one), so
// instanceof Error alone misses abort and timeout errors from fetch.
export function isErrorLike(value: unknown): value is Error {
  if (value instanceof Error) {
    return true
  }
  return typeof DOMException !== 'undefined' && value instanceof DOMException
}
