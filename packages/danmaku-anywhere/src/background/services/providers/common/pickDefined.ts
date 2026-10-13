export function pickDefined<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[]
): Partial<Pick<T, K>> {
  const picked: Partial<Pick<T, K>> = {}
  for (const key of keys) {
    if (source[key] !== undefined) {
      picked[key] = source[key]
    }
  }
  return picked
}
