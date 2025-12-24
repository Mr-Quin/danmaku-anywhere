import { createLogger, type LogEntry } from '@/common/Logger'

const logHandler: {
  handle?: (entry: LogEntry) => void
} = {}

export function setLogHandler(handler: (entry: LogEntry) => void) {
  logHandler.handle = handler
}

export const Logger = createLogger('', {
  onLog: (entry) => {
    console.log('Log entry', entry, logHandler)
    logHandler.handle?.(entry)
  },
  env: 'background',
})
