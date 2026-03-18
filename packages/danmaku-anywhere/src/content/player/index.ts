import { uiContainer } from '@/common/ioc/uiIoc'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { PlayerScript } from '@/content/player/PlayerScript.service'

const { data: frameId } = await chromeRpcClient.getFrameId()
const player = uiContainer.get(PlayerScript)
player.setup(frameId)
