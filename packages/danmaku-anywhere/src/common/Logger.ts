import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { serializeErrorJson } from './utils/serializeError'

const prefix = '[Danmaku]'

export type ILogger = {
  [Key in keyof Console]: Console[Key]
} & {
  sub: (subPrefix: string) => ILogger
}

export type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  type: 'console' | 'network'
  level: ConsoleMethod
  message: string
  prefix: string
  timestamp: number
  context: string
}

// DOMException is not an Error subclass in every realm (jsdom, for one), so
// instanceof Error alone misses abort and timeout errors from fetch.
function isErrorLike(value: unknown): value is Error {
  if (value instanceof Error) {
    return true
  }
  return typeof DOMException !== 'undefined' && value instanceof DOMException
}

function describeError(err: Error): string {
  const head = err.message ? `${err.name}: ${err.message}` : err.name
  const lines = [head]
  if (typeof err.stack === 'string' && err.stack.length > 0) {
    // V8 stacks start with the head line, Firefox stacks are frames only.
    if (err.stack.startsWith(head)) {
      lines[0] = err.stack
    } else {
      lines.push(err.stack)
    }
  }
  if (isErrorLike(err.cause)) {
    lines.push(`Caused by: ${describeError(err.cause)}`)
  }
  return lines.join('\n')
}

// Chrome's extension error view stringifies each console argument, which
// turns an error object into "[object DOMException]", so errors go to the
// console as text.
function toConsoleArg(arg: unknown): unknown {
  if (isErrorLike(arg)) {
    return describeError(arg)
  }
  return arg
}

function formatArgs(args: unknown[]): string {
  if (args.length === 0) return ''
  if (args.length === 1) {
    if (typeof args[0] === 'string') {
      return args[0]
    }
  }

  const serialized = args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg
      }
      if (isErrorLike(arg)) {
        return JSON.stringify(serializeErrorJson(arg))
      }
      try {
        return JSON.stringify(arg)
      } catch {
        return '[Unserializable]'
      }
    })
    .join(', ')

  return serialized
}

function truncateString(str: string, maxLength: number) {
  if (str.length <= maxLength) {
    return str
  }
  return str.slice(0, maxLength) + '...'
}

interface LoggerOptions {
  onLog?: (entry: LogEntry) => void
  env?: string
}

export const createLogger = (
  prefix: string,
  options: LoggerOptions = {}
): ILogger => {
  const logger = {} as ILogger

  const methods: ConsoleMethod[] = ['log', 'info', 'warn', 'error', 'debug']

  function log(method: ConsoleMethod, ...args: unknown[]) {
    console[method].call(console, prefix, ...args.map(toConsoleArg))

    if (options.onLog) {
      const env = options.env

      const serializedArgs = formatArgs(args)

      const entry: LogEntry = {
        type: 'console',
        level: method,
        message:
          method === 'error'
            ? serializedArgs // keep the full error message
            : truncateString(serializedArgs, 200),
        prefix,
        timestamp: Date.now(),
        context: env || 'Unknown',
      }

      options.onLog(entry)
    }
  }

  methods.forEach((method) => {
    logger[method] = log.bind(console, method)
  })

  logger.sub = (subPrefix: string) => {
    return createLogger(`${prefix}${subPrefix}`, options)
  }

  return logger
}

const getEnv = () => {
  if (import.meta.env.MODE === 'test') {
    return 'Test'
  }
  if (location.protocol.includes('extension')) {
    if (location.href.includes('popup')) {
      return 'Popup'
    }
    return 'Background'
  }
  return 'Content'
}

export const Logger = createLogger(prefix, {
  env: getEnv(),
  onLog: (entry) => {
    void chromeRpcClient.remoteLog(entry, { silent: true }).catch(() => {
      // ignore errors if background is not ready
    })
  },
}).sub(`[${getEnv()}]`)

export const LoggerSymbol = Symbol.for('Logger')
