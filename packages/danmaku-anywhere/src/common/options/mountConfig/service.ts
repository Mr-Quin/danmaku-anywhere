import { defaultMountConfig } from '@/common/options/mountConfig/constant'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'

export const mountConfigService = new OptionsService(
  'mountConfig',
  defaultMountConfig
)
