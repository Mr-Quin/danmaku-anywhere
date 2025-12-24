import { chromeRpcClient } from '@/common/rpcClient/background/client'

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
  args: unknown[]
  timestamp: number
  context: string
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

  // bind console to preserve the original console context
  // this is needed for the correct file and line number to be shown
  methods.forEach((method) => {
    logger[method] = console[method].bind(console, prefix)
  })

  // Wrap methods to send logs to background
  const originalMethods = { ...logger }
  methods.forEach((method) => {
    logger[method] = (...args: unknown[]) => {
      // Always log to console
      originalMethods[method](...args)

      const env = options.env

      const entry: LogEntry = {
        type: 'console',
        level: method,
        message:
          typeof args[0] === 'string'
            ? args[0].replace(prefix, '')
            : JSON.stringify(args[0]),
        args: args.slice(1),
        timestamp: Date.now(),
        context: env || 'Unknown',
      }

      if (env !== 'Background') {
        void chromeRpcClient.remoteLog(entry, { silent: true }).catch(() => {
          // ignore errors if background is not ready
        })
      } else {
        console.trace('Background log', entry)
      }
      if (options.onLog) {
        options.onLog(entry)
      }
    }
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

export const Logger = createLogger(prefix, { env: getEnv() }).sub(
  `[${getEnv()}]`
)

export const LoggerSymbol = Symbol.for('Logger')
