export type ErrorJson =
  | {
      type: 'error'
      name: string
      message: string
      stack?: string
      cause?: ErrorJson
      [key: string]: unknown
    }
  | {
      type:
        | 'string'
        | 'number'
        | 'bigint'
        | 'boolean'
        | 'symbol'
        | 'undefined'
        | 'object'
        | 'function'
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
  const serializedCause = err.cause ? serializeError(err.cause) : undefined

  return {
    type: 'error',
    name: err.name,
    message: err.message,
    stack: err.stack,
    cause: serializedCause,
    ...additionalProps,
  }
}

export function deserializeError(json: ErrorJson): Error {
  if (json.type === 'error') {
    const errorJson = json
    const error = new Error(errorJson.message)

    error.name = errorJson.name

    if (errorJson.stack) {
      error.stack = errorJson.stack
    }

    if (errorJson.cause) {
      error.cause = deserializeError(errorJson.cause)
    }

    // restore custom properties
    const knownKeys = ['type', 'name', 'message', 'stack', 'cause']
    for (const [key, value] of Object.entries(errorJson)) {
      if (!knownKeys.includes(key)) {
        // biome-ignore lint/suspicious/noExplicitAny: assigning unknown properties to error
        ;(error as any)[key] = value
      }
    }

    return error
  }

  return new Error(json.message)
}
