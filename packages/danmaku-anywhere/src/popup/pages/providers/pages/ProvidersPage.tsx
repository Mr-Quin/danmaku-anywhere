import { useState } from 'react'
import { TabLayout } from '@/common/components/layout/TabLayout'
import {
  createCustomDanDanPlayProvider,
  createCustomMacCmsProvider,
} from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { ProviderConfigList } from '../components/ProviderConfigList'
import { ProviderToolbar } from '../components/ProviderToolbar'
import { ProviderEditor } from './ProviderEditor'

export const ProvidersPage = () => {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null
  )
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
    setShowDeleteDialog(true)
    setDeletingProvider(provider)
  }

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeletingProvider(null)
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
        <ConfirmDeleteDialog
          open={showDeleteDialog}
          provider={deletingProvider}
          onClose={handleCloseDeleteDialog}
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
