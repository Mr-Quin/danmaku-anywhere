export const tryCatch = async <T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, Error]> => {
  try {
    const result = await fn()
    return [result, null] as const
  } catch (error) {
    if (error instanceof Error) {
      return [null, error] as const
    }
    return [null, new Error('An unknown error occurred')] as const
  }
}
