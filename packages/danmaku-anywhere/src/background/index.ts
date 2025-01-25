import { setupAlarms } from './alarm/setupAlarms'
import { setupContextMenu } from './contextMenu/setupContextMenu'
import { setupNetRequest } from './netRequest/setupNetrequest'
import { setupRpc } from './rpc/setupRpc'
import { setupScripting } from './scripting/setupScripting'
import { setupOptions } from './syncOptions/setupOptions'

setupOptions()
setupContextMenu()
setupScripting()
setupRpc()
setupNetRequest()
setupAlarms()
