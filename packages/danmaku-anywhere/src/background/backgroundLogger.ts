import { createLogger } from '@/common/Logger'
import type { LogService } from './services/Logging/Log.service'

let logService: LogService | null = null

export function setLogService(service: LogService) {
  logService = service
}

export const Logger = createLogger('', {
  onLog: (entry) => {
    void logService?.log(entry)
  },
  env: 'background',
})
