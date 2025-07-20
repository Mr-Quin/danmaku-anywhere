import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { setupPorts } from '@/background/ports/setupPorts'
import { BilibiliService } from '@/background/services/BilibiliService'
import { DanDanPlayService } from '@/background/services/DanDanPlayService'
import { DanmakuService } from '@/background/services/DanmakuService'
import { GenAIService } from '@/background/services/GenAIService'
import { IconService } from '@/background/services/IconService'
import { KazumiService } from '@/background/services/KazumiService'
import { ProviderService } from '@/background/services/ProviderService'
import { SeasonService } from '@/background/services/SeasonService'
import { TencentService } from '@/background/services/TencentService'
import { TitleMappingService } from '@/background/services/TitleMappingService'
import { IS_FIREFOX } from '@/common/constants'
import { db } from '@/common/db/db'
import { setupAlarms } from './alarm/setupAlarms'
import { setupContextMenu } from './contextMenu/setupContextMenu'
import { setupNetRequest } from './netRequest/setupNetrequest'
import { setupRpc } from './rpc/setupRpc'
import { setupScripting } from './scripting/setupScripting'
import { setupOptions } from './syncOptions/setupOptions'

// dependency injection
const seasonService = new SeasonService(db.season, db.episode)
const danmakuService = new DanmakuService(
  seasonService,
  db.episode,
  db.customEpisode
)

const danDanPlayService = new DanDanPlayService(seasonService, danmakuService)
const tencentService = new TencentService(seasonService, danmakuService)
const bilibiliService = new BilibiliService(seasonService, danmakuService)

const titleMappingService = new TitleMappingService(db.seasonMap)
const providerService = new ProviderService(
  titleMappingService,
  danmakuService,
  seasonService,
  danDanPlayService,
  bilibiliService,
  tencentService
)
const kazumiService = new KazumiService()
const iconService = new IconService()
const aiService = new GenAIService()

configureApiStore({
  baseUrl: import.meta.env.VITE_PROXY_URL,
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
  kazumiService
)
setupNetRequest()
setupAlarms(danmakuService)
setupPorts()

chrome.runtime.getPlatformInfo().then((platformInfo) => {
  if (platformInfo.os === 'android' || IS_FIREFOX) {
    return
  }
  setupContextMenu()
})
