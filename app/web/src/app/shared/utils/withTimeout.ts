const timeoutSymbol = Symbol('timeout')

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeout: number,
  errorMessage = 'Request timed out'
): Promise<T> => {
  const timeoutPromise = Promise.withResolvers()
  const timeoutId = setTimeout(() => {
    timeoutPromise.resolve(timeoutSymbol)
  }, timeout)

  const result = await Promise.race([promise, timeoutPromise.promise]).finally(
    () => {
      clearTimeout(timeoutId)
    }
  )

  if (result === timeoutSymbol) {
    throw new Error(errorMessage)
  }

  return result as T
}
