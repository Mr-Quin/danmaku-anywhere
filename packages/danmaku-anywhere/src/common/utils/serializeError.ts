export function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

const errKeys = ['name', 'message', 'stack', 'cause']

type ErrorJson = {
  name: string
  message: string
  stack?: string
  cause?: ErrorJson | string
  [key: string]: unknown
}

export function serializeErrorJson(err: Error): ErrorJson {
  // capture any additional custom properties
  const additionalProps = Object.fromEntries(
    Object.entries(err).filter(([key]) => !errKeys.includes(key))
  )

  // recursively serialize the cause
  const serializedCause = err.cause
    ? err.cause instanceof Error
      ? serializeErrorJson(err.cause)
      : String(err.cause)
    : undefined

  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    cause: serializedCause,
    ...additionalProps,
  }
}
