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
      if (arg instanceof Error) {
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
    if (method === 'error') {
      // for error, print the full error message with serialized error
      console[method].call(console, prefix, formatArgs(args))
    } else {
      console[method].call(console, prefix, ...args)
    }

    if (options.onLog) {
      const env = options.env

      const serailizedArgs = formatArgs(args)

      const entry: LogEntry = {
        type: 'console',
        level: method,
        message:
          method === 'error'
            ? serailizedArgs // keep the full error message
            : serailizedArgs.slice(0, 200) + '...',
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
