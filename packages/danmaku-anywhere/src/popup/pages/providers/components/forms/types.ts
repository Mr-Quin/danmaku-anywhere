import type { ProviderConfig } from '@/common/options/providerConfig/schema'

export interface ProviderFormProps {
  provider: ProviderConfig
  onSubmit: (data: ProviderConfig) => void | Promise<void>
  onReset?: () => void
  isEdit: boolean
}
