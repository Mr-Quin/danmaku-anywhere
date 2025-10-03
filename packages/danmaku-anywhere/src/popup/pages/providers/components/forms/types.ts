import type { ProviderConfig } from '@/common/options/providerConfig/schema'

export interface ProviderFormProps<T extends ProviderConfig = ProviderConfig> {
  provider: T
  onSubmit: (data: T) => void | Promise<void>
  onReset?: () => void
  isEdit: boolean
}
