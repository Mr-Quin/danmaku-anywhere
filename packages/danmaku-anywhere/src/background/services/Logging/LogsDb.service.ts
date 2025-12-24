import { inject, injectable } from 'inversify'
import { LogsDb } from '@/common/db/logsDb'
import type { LogEntry } from '@/common/Logger'

@injectable('Singleton')
export class LogsDbService {
  constructor(@inject(LogsDb) private db: LogsDb) {}

  async add(entry: LogEntry) {
    return this.db.logs.add(entry)
  }

  async count() {
    return this.db.logs.count()
  }

  async getOldestKeys(limit: number) {
    return this.db.logs.orderBy('id').limit(limit).primaryKeys()
  }

  async deleteOldest(limit: number) {
    const keys = await this.getOldestKeys(limit)
    return this.db.logs.bulkDelete(keys)
  }

  async exportSorted() {
    return this.db.logs.orderBy('timestamp').toArray()
  }

  async clear() {
    return this.db.logs.clear()
  }
}
