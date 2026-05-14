import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { AlarmManager } from '@/background/alarm/AlarmManager'
import { ContextMenuManager } from '@/background/contextMenu/ContextMenuManager'
import { NetRequestManager } from '@/background/netRequest/NetrequestManager'
import { PortsManager } from '@/background/ports/PortsManager'
import { RpcManager } from '@/background/rpc/RpcManager'
import { MountConfigTabReloader } from '@/background/scripting/MountConfigTabReloader'
import { ScriptingManager } from '@/background/scripting/ScriptingManager'
import { OptionsManager } from '@/background/syncOptions/OptionsManager'
import { deferredConfigureStore } from '@/background/utils/deferredConfigureStore'
import { generateId } from '@/background/utils/generateId'
import { EXTENSION_VERSION } from '@/common/constants'
import { attachDevApi } from '@/devApi'
import { setLogService } from './backgroundLogger'
import { container } from './ioc'
import { LogService } from './services/Logging/Log.service'

configureApiStore({
  baseUrl: import.meta.env.VITE_PROXY_URL,
  daVersion: EXTENSION_VERSION,
})

container.get(OptionsManager).setup()
container.get(ScriptingManager).setup()
container.get(MountConfigTabReloader).setup()
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

// Dev API attach. Static import because dynamic import via __vitePreload is
// broken for MV3 SWs under crxjs (silently never resolves). Trade-off: the
// devApi module sits in the bundle even for VITE_DA_ENV=prod; CI's grep
// guard is the DCE enforcement (see .github/workflows/quality-e2e.yml).
if (import.meta.env.VITE_DA_ENV !== 'prod') {
  attachDevApi(container, import.meta.env.VITE_DA_ENV)
}
