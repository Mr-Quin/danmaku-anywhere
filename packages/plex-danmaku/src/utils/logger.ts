const prefix = `[Danmaku]`

type Logger = {
  [Key in keyof Console]: Console[Key]
}

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'

export const logger: Logger = new Proxy(console, {
  get(target, method) {
    if (typeof target[method as keyof Console] === 'function') {
      return (...args: any[]) => {
        target[method as ConsoleMethod](prefix, ...args)
      }
    }
    return target[method as keyof Console]
  },
})
