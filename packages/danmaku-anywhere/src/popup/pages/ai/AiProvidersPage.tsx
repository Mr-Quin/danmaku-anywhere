import { AddCircle } from '@mui/icons-material'
import { IconButton, Stack } from '@mui/material'
import { type ReactElement, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { ScrollBox } from '@/common/components/layout/ScrollBox'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useToast } from '@/common/components/Toast/toastStore'
import type {
  AiProviderConfig,
  AiProviderConfigInput,
} from '@/common/options/aiProviderConfig/schema'
import { useEditAiProviderConfig } from '@/common/options/aiProviderConfig/useAiProviderConfig'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { AiProviderConfigList } from './components/AiProviderConfigList'
import { AiProviderForm } from './components/AiProviderForm'

export const AiProvidersPage = (): ReactElement => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const dialog = useDialog()
  const { remove, update, create } = useEditAiProviderConfig()
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)

  const [editingProvider, setEditingProvider] =
    useState<AiProviderConfigInput | null>(null)

  const handleEditProvider = (provider: AiProviderConfig) => {
    setEditingProvider(provider)
    setMode('edit')
  }

  const handleAddProvider = () => {
    setEditingProvider({
      name: '',
      provider: 'openai-compatible',
      enabled: true,
      settings: {
        baseUrl: '',
        model: '',
        apiKey: '',
      },
    })
    setMode('add')
  }

  const handleCloseEditor = () => {
    setEditingProvider(null)
    setMode(null)
  }

  const handleSave = async (data: AiProviderConfig) => {
    if (mode === 'edit' && editingProvider?.id) {
      await update.mutateAsync(
        { id: editingProvider.id, config: data },
        {
          onSuccess: () => {
            toast.success(t('common.updated', 'Updated'))
            handleCloseEditor()
          },
          onError: (err) => toast.error(err.message),
        }
      )
    } else {
      await create.mutateAsync(data, {
        onSuccess: () => {
          toast.success(t('common.created', 'Created'))
          handleCloseEditor()
        },
        onError: (err) => toast.error(err.message),
      })
    }
  }

  const handleDelete = (provider: AiProviderConfig) => {
    dialog.delete({
      title: t('ai.delete.title', 'Delete Provider'),
      content: t(
        'ai.delete.message',
        'Are you sure you want to delete "{{name}}"?',
        { name: provider.name }
      ),
      confirmText: t('common.delete', 'Delete'),
      onConfirm: async () => {
        if (!provider.id) return

        await remove.mutateAsync(provider.id, {
          onSuccess: () => {
            toast.success(t('common.deleted', 'Deleted'))
          },
          onError: (error) => {
            toast.error(error.message)
          },
        })
      },
    })
  }

  if (mode && editingProvider) {
    return (
      <OptionsPageLayout>
        <Stack direction="column" height={1}>
          <OptionsPageToolBar
            title={
              mode === 'add'
                ? t('ai.addProvider', 'Add Provider')
                : t('ai.editProvider', 'Edit Provider')
            }
            onGoBack={handleCloseEditor}
          />
          <ScrollBox p={2} overflow="auto">
            <AiProviderForm
              provider={editingProvider}
              onSubmit={handleSave}
              isEdit={mode === 'edit'}
            />
          </ScrollBox>
        </Stack>
      </OptionsPageLayout>
    )
  }

  return (
    <TabLayout>
      <TabToolbar title={t('ai.providers', 'AI Providers')}>
        <IconButton color="primary" size="small" onClick={handleAddProvider}>
          <AddCircle />
        </IconButton>
      </TabToolbar>
      <AiProviderConfigList
        onEdit={handleEditProvider}
        onDelete={handleDelete}
      />
    </TabLayout>
  )
}
