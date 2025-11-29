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
        if (!provider.id || provider.isBuiltIn) {
          return
        }

        await remove.mutateAsync(provider.id, {
          onSuccess: () => {
            toast.success(t('providers.alert.deleted'))
          },
          onError: (error) => {
            toast.error(error.message)
          },
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
