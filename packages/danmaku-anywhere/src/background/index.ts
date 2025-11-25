import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { setupPorts } from '@/background/ports/setupPorts'
import type { GenAIService } from '@/background/services/GenAIService'
import type { IconService } from '@/background/services/IconService'
import type { KazumiService } from '@/background/services/KazumiService'
import type { DanmakuService } from '@/background/services/persistence/DanmakuService'
import type { SeasonService } from '@/background/services/persistence/SeasonService'
import type { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import type { ProviderService } from '@/background/services/providers/ProviderService'
import { SERVICE_TYPES } from '@/background/services/types'
import { deferredConfigureStore } from '@/background/utils/deferredConfigureStore'
import { generateId } from '@/background/utils/generateId'
import { EXTENSION_VERSION } from '@/common/constants'
import { setupAlarms } from './alarm/setupAlarms'
import { setupContextMenu } from './contextMenu/setupContextMenu'
import { container } from './ioc'
import { setupNetRequest } from './netRequest/setupNetrequest'
import { setupRpc } from './rpc/setupRpc'
import { setupScripting } from './scripting/setupScripting'
import { setupOptions } from './syncOptions/setupOptions'

// dependency injection
const seasonService = container.get<SeasonService>(SERVICE_TYPES.SeasonService)
const danmakuService = container.get<DanmakuService>(
  SERVICE_TYPES.DanmakuService
)

const titleMappingService = container.get<TitleMappingService>(
  SERVICE_TYPES.TitleMappingService
)
const providerService = container.get<ProviderService>(
  SERVICE_TYPES.ProviderService
)
const kazumiService = container.get<KazumiService>(SERVICE_TYPES.KazumiService)
const iconService = container.get<IconService>(SERVICE_TYPES.IconService)
const aiService = container.get<GenAIService>(SERVICE_TYPES.GenAIService)

configureApiStore({
  baseUrl: import.meta.env.VITE_PROXY_URL,
  daVersion: EXTENSION_VERSION,
})

setupOptions()
setupScripting()
setupRpc(
  providerService,
  iconService,
  danmakuService,
  seasonService,
  aiService,
  kazumiService,
  titleMappingService
)
setupNetRequest()
setupAlarms(danmakuService)
setupPorts()

chrome.runtime.getPlatformInfo().then((platformInfo) => {
  if (platformInfo.os === 'android') {
    return
  }
  setupContextMenu()
})

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.tabs.create({
      url: 'https://docs.danmaku.weeblify.app/getting-started#首次使用',
    })
  }
})

generateId()
void deferredConfigureStore()
