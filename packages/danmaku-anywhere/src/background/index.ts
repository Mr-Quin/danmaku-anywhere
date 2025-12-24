import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { AlarmManager } from '@/background/alarm/AlarmManager'
import { ContextMenuManager } from '@/background/contextMenu/ContextMenuManager'
import { NetRequestManager } from '@/background/netRequest/NetrequestManager'
import { PortsManager } from '@/background/ports/PortsManager'
import { RpcManager } from '@/background/rpc/RpcManager'
import { ScriptingManager } from '@/background/scripting/ScriptingManager'
import { OptionsManager } from '@/background/syncOptions/OptionsManager'
import { deferredConfigureStore } from '@/background/utils/deferredConfigureStore'
import { generateId } from '@/background/utils/generateId'
import { EXTENSION_VERSION } from '@/common/constants'
import { setLogService } from './backgroundLogger'
import { container } from './ioc'
import { LogService } from './services/Logging/Log.service'

configureApiStore({
  baseUrl: import.meta.env.VITE_PROXY_URL,
  daVersion: EXTENSION_VERSION,
})

container.get(OptionsManager).setup()
container.get(ScriptingManager).setup()
container.get(RpcManager).setup()
container.get(NetRequestManager).setup()
container.get(AlarmManager).setup()
container.get(PortsManager).setup()

setLogService(container.get(LogService))

chrome.runtime.getPlatformInfo().then((platformInfo) => {
  if (platformInfo.os === 'android') {
    return
  }
  container.get<ContextMenuManager>(ContextMenuManager).setup()
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
