import { defaultExtensionOptions } from '@/common/options/extensionOptions/constant'
import { OptionsService } from '@/common/options/OptionsService/OptionsService'

export const extensionOptionsService = new OptionsService(
  'extensionOptions',
  defaultExtensionOptions
)
