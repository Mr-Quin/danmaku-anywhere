import { defaultDanmakuOptions } from '@/common/options/danmakuOptions/constant'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'

export const danmakuOptionsService = new OptionsService(
  'danmakuOptions',
  defaultDanmakuOptions
)
