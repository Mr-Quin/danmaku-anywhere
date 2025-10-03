import { useState } from 'react'
import {
  createCustomDanDanPlayProvider,
  createCustomMacCmsProvider,
} from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { TabLayout } from '@/content/common/TabLayout'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { ProviderConfigList } from '../components/ProviderConfigList'
import { ProviderToolbar } from '../components/ProviderToolbar'
import { ProviderEditor } from './ProviderEditor'

export const ProvidersPage = () => {
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null
  )
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [deletingProvider, setDeletingProvider] =
    useState<ProviderConfig | null>(null)

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
    setDeletingProvider(provider)
  }

  const handleCloseDeleteDialog = () => {
    setDeletingProvider(null)
  }

  if (editingProvider && mode) {
    return (
      <ProviderEditor
        mode={mode}
        provider={editingProvider}
        onClose={handleCloseEditor}
      />
    )
  }

  return (
    <TabLayout>
      <ProviderToolbar
        onAddDanDanPlayProvider={handleAddDanDanPlayProvider}
        onAddMacCmsProvider={handleAddMacCmsProvider}
      />
      <ProviderConfigList onEdit={handleEditProvider} onDelete={handleDelete} />
      <ConfirmDeleteDialog
        provider={deletingProvider}
        onClose={handleCloseDeleteDialog}
      />
    </TabLayout>
  )
}
