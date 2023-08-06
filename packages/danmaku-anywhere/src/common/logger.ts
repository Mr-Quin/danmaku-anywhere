const prefix = `[Danmaku]`

type Logger = {
  [Key in keyof Console]: Console[Key]
} & {
  sub: (subPrefix: string) => Logger
}

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'

const createLogger = (prefix: string): Logger => {
  return new Proxy(console, {
    get(target, method) {
      if (typeof target[method as keyof Console] === 'function') {
        return (...args: any[]) => {
          target[method as ConsoleMethod](prefix, ...args)
        }
      }
      if (method === 'sub') {
        return (subPrefix: string) => createLogger(`${prefix} ${subPrefix}`)
      }
      return target[method as keyof Console]
    },
  }) as Logger
}

export const mainLogger = createLogger(prefix)
export const popupLogger = mainLogger.sub('[Popup]')
export const contentLogger = mainLogger.sub('[Content]')
export const backgroundLogger = mainLogger.sub('[Background]')
