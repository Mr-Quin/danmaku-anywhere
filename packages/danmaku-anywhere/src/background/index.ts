import { IS_FIREFOX } from '@/common/constants'
import { setupAlarms } from './alarm/setupAlarms'
import { setupContextMenu } from './contextMenu/setupContextMenu'
import { setupNetRequest } from './netRequest/setupNetrequest'
import { setupRpc } from './rpc/setupRpc'
import { setupScripting } from './scripting/setupScripting'
import { setupOptions } from './syncOptions/setupOptions'

setupOptions()
setupScripting()
setupRpc()
setupNetRequest()
setupAlarms()
chrome.runtime.getPlatformInfo().then((platformInfo) => {
  if (platformInfo.os === 'android' || IS_FIREFOX) {
    return
  }
  setupContextMenu()
})
