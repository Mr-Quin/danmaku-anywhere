import type {
  ProviderConfigDraft,
  ProviderConfigEdit,
} from '@/common/options/providerConfig/schema'

export interface ProviderFormProps {
  // A stored config when editing, a draft without an id when adding
  provider: ProviderConfigDraft & { id?: string }
  onSubmit: (edit: Required<ProviderConfigEdit>) => void | Promise<void>
  onReset?: () => void
  isEdit: boolean
}
