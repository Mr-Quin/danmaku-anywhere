import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { setupPorts } from '@/background/ports/setupPorts'
import { GenAIService } from '@/background/services/GenAIService'
import { IconService } from '@/background/services/IconService'
import { KazumiService } from '@/background/services/KazumiService'
import { DanmakuService } from '@/background/services/persistence/DanmakuService'
import { SeasonService } from '@/background/services/persistence/SeasonService'
import { TitleMappingService } from '@/background/services/persistence/TitleMappingService'
import { BilibiliService } from '@/background/services/providers/bilibili/BilibiliService'
import { MacCmsProviderService } from '@/background/services/providers/MacCmsProviderService'
import { ProviderService } from '@/background/services/providers/ProviderService'
import { TencentService } from '@/background/services/providers/tencent/TencentService'
import { deferredConfigureStore } from '@/background/utils/deferredConfigureStore'
import { generateId } from '@/background/utils/generateId'
import { EXTENSION_VERSION } from '@/common/constants'
import type {
  BuiltInBilibiliProvider,
  BuiltInTencentProvider,
  CustomMacCmsProvider,
} from '@/common/options/providerConfig/schema'
import { setupAlarms } from './alarm/setupAlarms'
import { setupContextMenu } from './contextMenu/setupContextMenu'
import { setupNetRequest } from './netRequest/setupNetrequest'
import { setupRpc } from './rpc/setupRpc'
import { setupScripting } from './scripting/setupScripting'
import { setupOptions } from './syncOptions/setupOptions'

// dependency injection
const seasonService = new SeasonService()
const danmakuService = new DanmakuService(seasonService)

// These instances are for RPC / Global methods ONLY.
// They are initialized with dummy configs because RPC methods don't use the config.
const tencentService = new TencentService({} as BuiltInTencentProvider)
const bilibiliService = new BilibiliService({} as BuiltInBilibiliProvider)
const customProviderService = new MacCmsProviderService(
  danmakuService,
  {} as CustomMacCmsProvider
)

const titleMappingService = new TitleMappingService()
const providerService = new ProviderService(
  titleMappingService,
  danmakuService,
  seasonService
)
const kazumiService = new KazumiService()
const iconService = new IconService()
const aiService = new GenAIService()

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
  bilibiliService,
  tencentService,
  kazumiService,
  titleMappingService,
  customProviderService
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
