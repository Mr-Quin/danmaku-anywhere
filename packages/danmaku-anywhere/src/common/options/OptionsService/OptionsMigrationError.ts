const OPTIONS_MIGRATION_ERROR_NAME = 'OptionsMigrationError'

// The stored data of an option store could not be migrated to the current
// version: a step threw, or what is stored is not an options envelope.
export class OptionsMigrationError extends Error {
  constructor(
    readonly store: string,
    options: { cause: unknown }
  ) {
    const detail =
      options.cause instanceof Error ? `: ${options.cause.message}` : ''
    super(`Could not migrate ${store}${detail}`, options)
    this.name = OPTIONS_MIGRATION_ERROR_NAME
  }
}

export function isOptionsMigrationError(error: unknown): boolean {
  for (let current = error; current instanceof Error; ) {
    if (current.name === OPTIONS_MIGRATION_ERROR_NAME) {
      return true
    }
    current = current.cause
  }
  return false
}
