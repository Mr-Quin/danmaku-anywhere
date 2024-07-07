import { setupContextMenu } from './contextMenu/setupContextMenu'
import { setupRpc } from './rpc/setupRpc'
import { setupScripting } from './scripting/setupScripting'

import { setupOptions } from '@/background/syncOptions/setupOptions'

void setupOptions()
void setupContextMenu()
void setupScripting()
void setupRpc()
