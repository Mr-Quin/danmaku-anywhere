import { DA_ENV } from '@/common/constants'
import { uiContainer } from '@/common/ioc/uiIoc'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { createTrackingService } from '@/common/telemetry/getTrackingService'
import { PlayerScript } from '@/content/player/PlayerScript.service'

createTrackingService(DA_ENV, 'player')

const { data: frameId } = await chromeRpcClient.getFrameId()
const player = uiContainer.get(PlayerScript)
player.setup(frameId)
