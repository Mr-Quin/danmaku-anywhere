import * as process from 'node:process'

const prefix = `[Danmaku]`

type Logger = {
  [Key in keyof Console]: Console[Key]
} & {
  sub: (subPrefix: string) => Logger
}

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'

const createLogger = (prefix: string): Logger => {
  const logger = {} as Logger

  const methods: ConsoleMethod[] = ['log', 'info', 'warn', 'error', 'debug']

  // bind console to preserve the original console context
  // this is needed for the correct file and line number to be shown
  methods.forEach((method) => {
    logger[method] = console[method].bind(console, prefix)
  })

  logger.sub = (subPrefix: string) => {
    return createLogger(`${prefix} ${subPrefix}`)
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

export const Logger = createLogger(prefix).sub(`[${getEnv()}]`)
