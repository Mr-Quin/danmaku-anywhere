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
    this.name = 'OptionsMigrationError'
  }
}
