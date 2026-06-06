import { Clear, Search } from '@mui/icons-material'
import { IconButton, InputAdornment, Stack, TextField } from '@mui/material'
import { type ReactElement, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { TabBody } from '@/common/components/layout/TabBody'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  createCustomDanDanPlayProvider,
  createCustomMacCmsProvider,
} from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import {
  createConfigFromManifest,
  manifestNeedsConfigForm,
  matchesQuery,
} from '../catalog'
import { CatalogSection } from '../components/CatalogSection'
import { ProviderAddMenu } from '../components/ProviderAddMenu'
import { ProviderConfigList } from '../components/ProviderConfigList'
import { SectionHeader } from '../components/SectionHeader'
import { ProviderEditor } from './ProviderEditor'

export const ProvidersPage = (): ReactElement => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const dialog = useDialog()
  const { configs } = useProviderConfig()
  const { create, remove } = useEditProviderConfig()
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [filter, setFilter] = useState('')

  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null
  )

  const installedManifestIds = new Set(
    configs.map((config) => config.manifestId)
  )
  const installedCount = configs.filter((config) =>
    matchesQuery(filter, config.name, config.manifestId)
  ).length

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

  const handleImport = (manifest: ProviderManifestInfo) => {
    const config = createConfigFromManifest(manifest)
    if (manifestNeedsConfigForm(manifest.configSchema)) {
      setEditingProvider(config)
      setMode('add')
      return
    }
    create.mutate(config, {
      onSuccess: () => {
        toast.success(t('providers.alert.created', 'Provider created'))
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const handleDelete = (provider: ProviderConfig) => {
    dialog.delete({
      title: t('providers.delete.title', 'Delete Provider'),
      content: t(
        'providers.delete.message',
        'Are you sure you want to delete "{{name}}"? Once a provider is deleted, the season and episodes associated with it will no longer be able to be refreshed.',
        { name: provider.name }
      ),
      confirmText: t('common.delete', 'Delete'),
      onConfirm: async () => {
        if (!provider.id || provider.isBuiltIn) {
          return
        }

        await remove.mutateAsync(provider.id, {
          onSuccess: () => {
            toast.success(t('providers.alert.deleted', 'Provider deleted'))
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
        <TabToolbar title={t('providers.name', 'Danmaku Providers')}>
          <ProviderAddMenu
            onAddDanDanPlayProvider={handleAddDanDanPlayProvider}
            onAddMacCmsProvider={handleAddMacCmsProvider}
          />
        </TabToolbar>
        <TabBody>
          <Stack direction="column">
            <TextField
              size="small"
              fullWidth
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('providers.filter.placeholder', 'Filter sources')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: filter ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setFilter('')}>
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
            <SectionHeader
              title={t('providers.installed.title', 'Installed')}
              count={installedCount}
            />
            <ProviderConfigList
              filter={filter}
              onEdit={handleEditProvider}
              onDelete={handleDelete}
            />
            <CatalogSection
              filter={filter}
              installedManifestIds={installedManifestIds}
              onImport={handleImport}
              isImporting={create.isPending}
            />
          </Stack>
        </TabBody>
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
