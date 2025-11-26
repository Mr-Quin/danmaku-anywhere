import { configureApiStore } from '@danmaku-anywhere/danmaku-provider'
import { AlarmManager } from '@/background/alarm/setupAlarms'
import { ContextMenuManager } from '@/background/contextMenu/setupContextMenu'
import { NetRequestManager } from '@/background/netRequest/setupNetrequest'
import { PortsManager } from '@/background/ports/setupPorts'
import { RpcManager } from '@/background/rpc/setupRpc'
import { ScriptingManager } from '@/background/scripting/setupScripting'
import { OptionsManager } from '@/background/syncOptions/setupOptions'
import { deferredConfigureStore } from '@/background/utils/deferredConfigureStore'
import { generateId } from '@/background/utils/generateId'
import { EXTENSION_VERSION } from '@/common/constants'
import { container } from './ioc'

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
