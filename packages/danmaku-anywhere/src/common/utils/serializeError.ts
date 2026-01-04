export type ErrorJson =
  | {
      type: 'error'
      name: string
      message: string
      stack?: string
      cause?: ErrorJson | string
      [key: string]: unknown
    }
  | {
      type: string
      message: string
    }

export function serializeError(error: unknown): ErrorJson {
  if (error instanceof Error) {
    return serializeErrorJson(error)
  }
  if (typeof error === 'string') {
    return {
      type: 'string',
      message: error,
    }
  }
  const type = typeof error
  try {
    return {
      type,
      message: JSON.stringify(error),
    }
  } catch {
    return {
      type,
      message: '[Unserializable] Unknown error',
    }
  }
}

const errKeys = ['name', 'message', 'stack', 'cause']

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
    type: 'error',
    name: err.name,
    message: err.message,
    stack: err.stack,
    cause: serializedCause,
    ...additionalProps,
  }
}
