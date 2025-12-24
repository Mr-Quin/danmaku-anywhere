import { inject, injectable } from 'inversify'
import type { LogEntry } from '@/common/Logger'
import { LogsDbService } from './LogsDb.service'

const MAX_LOGS = 2000
const DELETE_BUFFER = 100
const PRUNE_CHECK_PROBABILITY = 0.05

@injectable('Singleton')
export class LogService {
  constructor(@inject(LogsDbService) private logsDb: LogsDbService) {}

  async log(entry: LogEntry) {
    // best effort save, non-blocking
    void this.saveLog(entry)
  }

  private async saveLog(entry: LogEntry) {
    try {
      await this.logsDb.add(entry)

      // loose check to avoid counting every time
      if (Math.random() < PRUNE_CHECK_PROBABILITY) {
        const count = await this.logsDb.count()
        if (count > MAX_LOGS) {
          // delete a bit more to avoid frequent deletes
          const deleteCount = count - MAX_LOGS + DELETE_BUFFER
          await this.logsDb.deleteOldest(deleteCount)
        }
      }
    } catch (e) {
      console.error('Failed to save log', e)
    }
  }
}
