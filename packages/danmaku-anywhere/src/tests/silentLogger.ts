import type { ILogger } from '@/common/Logger'

function noop() {
  return undefined
}

const silentConsole: Console = {
  Console: console.Console,
  assert: noop,
  clear: noop,
  count: noop,
  countReset: noop,
  debug: noop,
  dir: noop,
  dirxml: noop,
  error: noop,
  group: noop,
  groupCollapsed: noop,
  groupEnd: noop,
  info: noop,
  log: noop,
  profile: noop,
  profileEnd: noop,
  table: noop,
  time: noop,
  timeEnd: noop,
  timeLog: noop,
  timeStamp: noop,
  trace: noop,
  warn: noop,
}

function sub(_subPrefix: string): ILogger {
  return silentLogger
}

export const silentLogger = {
  ...silentConsole,
  sub,
} satisfies ILogger
