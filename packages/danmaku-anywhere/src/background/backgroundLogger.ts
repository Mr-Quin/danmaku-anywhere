import { createLogger } from '@/common/Logger'
import { container } from './ioc'
import { LogService } from './services/LogService'

let logService: LogService | null = null

function getLogService() {
  if (!logService) {
    logService = container.get<LogService>(LogService)
  }
  return logService
}

export const Logger = createLogger('', {
  onLog: (entry) => {
    const logService = getLogService()
    void logService.log(entry)
  },
  env: 'background',
})
