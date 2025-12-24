import { inject, injectable } from 'inversify'
import type { LogEntry } from '@/common/Logger'
import { LogsDbService } from './LogsDbService'

const MAX_LOGS = 20000
const DELETE_BUFFER = 100

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
      if (Math.random() < 0.01) {
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

  async export(): Promise<LogEntry[]> {
    return await this.logsDb.exportSorted()
  }

  async exportAndClear() {
    const logs = await this.export()
    const jsonString = JSON.stringify(logs, null, 2)
    // URL.createObjectURL is not available in service worker, use data uri instead
    const url = `data:application/json;base64,${btoa(unescape(encodeURIComponent(jsonString)))}`
    const filename = `danmaku-debug-${Date.now()}.json`

    await chrome.downloads.download({
      url,
      filename,
      saveAs: true,
    })

    await this.logsDb.clear()
  }
}
