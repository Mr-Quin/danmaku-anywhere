import { type ReactElement, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  createCustomDanDanPlayProvider,
  createCustomMacCmsProvider,
} from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { useEditProviderConfig } from '@/common/options/providerConfig/useProviderConfig'
import { ProviderConfigList } from '../components/ProviderConfigList'
import { ProviderToolbar } from '../components/ProviderToolbar'
import { ProviderEditor } from './ProviderEditor'

export const ProvidersPage = (): ReactElement => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const dialog = useDialog()
  const { remove } = useEditProviderConfig()
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)

  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null
  )

  const handleEditProvider = (provider: ProviderConfig) => {
    setEditingProvider(provider)
    setMode('edit')
  }

  const handleAddDanDanPlayProvider = () => {
    setEditingProvider(createCustomDanDanPlayProvider())
    setMode('add')
  }

  const handleAddMacCmsProvider = () => {
    setEditingProvider(createCustomMacCmsProvider())
    setMode('add')
  }

  const handleCloseEditor = () => {
    setEditingProvider(null)
    setMode(null)
  }

  const handleDelete = (provider: ProviderConfig) => {
    dialog.delete({
      title: t('providers.delete.title'),
      content: t('providers.delete.message', { name: provider.name }),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        if (!provider.id || provider.isBuiltIn) return

        return new Promise<void>((resolve, reject) => {
          remove.mutate(provider.id, {
            onSuccess: () => {
              toast.success(t('providers.alert.deleted'))
              resolve()
            },
            onError: (error) => {
              toast.error(error.message)
              // We reject here to stop the dialog from closing automatically if we want,
              // or resolve if we want it to close anyway. The dialog component doesn't close on error.
              // But here we are using a callback style mutation.
              // If we want the dialog loading state to persist until success, we wrap in promise.
              // The GlobalDialog awaits the result.
              reject(error)
            },
          })
        })
      },
    })
  }

  return (
    <>
      <TabLayout>
        <ProviderToolbar
          onAddDanDanPlayProvider={handleAddDanDanPlayProvider}
          onAddMacCmsProvider={handleAddMacCmsProvider}
        />
        <ProviderConfigList
          onEdit={handleEditProvider}
          onDelete={handleDelete}
        />
      </TabLayout>

      {editingProvider && mode && (
        <ProviderEditor
          mode={mode}
          provider={editingProvider}
          onClose={handleCloseEditor}
        />
      )}
    </>
  )
}
