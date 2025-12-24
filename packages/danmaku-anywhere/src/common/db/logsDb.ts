import { Dexie } from 'dexie'
import { injectable } from 'inversify'
import type { LogEntry } from '../Logger'

@injectable('Singleton')
export class LogsDb extends Dexie {
  logs!: Dexie.Table<LogEntry, number, LogEntry>

  isReady = new Promise<boolean>((resolve) => {
    this.on('ready', () => resolve(true))
  })

  constructor() {
    super('danmaku-anywhere-logs')

    this.version(1).stores({
      logs: '++id, level, context, timestamp',
    })

    this.open()
  }
}
