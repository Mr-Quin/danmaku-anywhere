const OPTIONS_OUTDATED_ERROR_NAME = 'OptionsOutdatedError'

// A write found the store tagged with an older version than this build's,
// which the next upgrade migrates. The RPC client hands callers a plain error,
// so they recognise it with isOptionsOutdatedError rather than instanceof.
export class OptionsOutdatedError extends Error {
  readonly code = 'options.outdated'

  constructor(
    readonly store: string,
    readonly version: number,
    readonly expected: number
  ) {
    super(
      `Cannot change ${store} stored at version ${version}, expected ${expected}`
    )
    this.name = OPTIONS_OUTDATED_ERROR_NAME
  }
}

export function isOptionsOutdatedError(error: unknown): boolean {
  for (let current = error; current instanceof Error; ) {
    if (current.name === OPTIONS_OUTDATED_ERROR_NAME) {
      return true
    }
    current = current.cause
  }
  return false
}
