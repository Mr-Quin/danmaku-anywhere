import { uploadFile } from '@danmaku-anywhere/danmaku-provider/files'
import { inject, injectable } from 'inversify'
import JSZip from 'jszip'
import { NetRequestManager } from '@/background/netRequest/NetrequestManager'
import { tryCatch } from '@/common/utils/tryCatch'
import { LogsDbService } from '../Logging/LogsDb.service'

interface DebugData {
  logs: unknown
  dynamicNetRequest: unknown
}

@injectable('Singleton')
export class DebugFileService {
  constructor(
    @inject(LogsDbService) private logsDb: LogsDbService,
    @inject(NetRequestManager) private netRequestManager: NetRequestManager
  ) {}

  async clear() {
    return this.logsDb.clear()
  }

  async upload(): Promise<{ id: string }> {
    const data = await this.getData()

    const content = JSON.stringify(data)
    const zip = new JSZip()

    zip.file('debug.json', content)
    const blob = await zip.generateAsync({ type: 'blob' })

    const file = new File([blob], 'debug.zip', {
      type: 'application/zip',
    })

    const res = await uploadFile(file)

    return res
  }

  private async getData(): Promise<DebugData> {
    let [logs, err] = await tryCatch(() => this.logsDb.exportSorted())

    if (err) {
      console.error('Failed to get logs', err)
      ;(logs as unknown) = err.message
    }

    let [dynamicNetRequest, err2] = await tryCatch(() =>
      this.netRequestManager.getRules()
    )

    if (err2) {
      console.error('Failed to get dynamic net request', err2)
      ;(dynamicNetRequest as unknown) = err2.message
    }

    return {
      logs,
      dynamicNetRequest,
    }
  }
}
