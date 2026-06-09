import { Clear, Search, SwapVert } from '@mui/icons-material'
import {
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material'
import { type ReactElement, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { TabBody } from '@/common/components/layout/TabBody'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  createCustomDanDanPlayProvider,
  createCustomMacCmsProvider,
  createDefaultProviderConfig,
} from '@/common/options/providerConfig/constant'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import type { ProviderManifestInfo } from '@/common/rpcClient/background/types'
import {
  createConfigFromManifest,
  groupInstalled,
  manifestNeedsConfigForm,
  matchesQuery,
} from '../catalog'
import { CatalogSection } from '../components/CatalogSection'
import { InstalledList } from '../components/InstalledList'
import { NeedsAttentionCallout } from '../components/NeedsAttentionCallout'
import { ProviderAddMenu } from '../components/ProviderAddMenu'
import { SectionHeader } from '../components/SectionHeader'
import { UpdatesSection } from '../components/UpdatesSection'
import { useDeleteUserManifest } from '../hooks/useManifestEditor'
import { useManifestList } from '../hooks/useManifestList'
import { ProviderEditor } from './ProviderEditor'

export const ProvidersPage = (): ReactElement => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast.use.toast()
  const dialog = useDialog()
  const { configs } = useProviderConfig()
  const { create, remove } = useEditProviderConfig()
  const deleteManifest = useDeleteUserManifest()
  const { data: manifestData } = useManifestList()
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [filter, setFilter] = useState('')
  const [reorderMode, setReorderMode] = useState(false)

  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(
    null
  )

  const manifestById = useMemo(
    () => new Map((manifestData?.manifests ?? []).map((m) => [m.id, m])),
    [manifestData]
  )

  const installedManifestIds = new Set(
    configs.map((config) => config.manifestId)
  )
  const matchesConfig = (config: ProviderConfig) =>
    matchesQuery(
      filter,
      config.name,
      config.manifestId,
      manifestById.get(config.manifestId)?.name ?? ''
    )
  const visibleConfigs = configs.filter(matchesConfig)
  const installedCount = groupInstalled(visibleConfigs).length
  const filterActive = filter.trim() !== ''

  const handleEdit = (provider: ProviderConfig) => {
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

  const handleAddInstance = () => {
    setEditingProvider(createCustomDanDanPlayProvider())
    setMode('add')
  }

  const handleCloseEditor = () => {
    setEditingProvider(null)
    setMode(null)
  }

  const handleAuthorManifest = () => {
    navigate('editor')
  }

  const handleViewSource = (manifestId: string) => {
    navigate('editor', { state: { manifestId } })
  }

  const createConfig = (config: ProviderConfig) => {
    create.mutate(config, {
      onSuccess: () => {
        toast.success(t('providers.alert.created', 'Provider created'))
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  const handleImport = (manifest: ProviderManifestInfo) => {
    const seeded = createDefaultProviderConfig(manifest.id, manifest.name)
    if (seeded) {
      createConfig(seeded)
      return
    }
    const config = createConfigFromManifest(manifest)
    if (manifestNeedsConfigForm(manifest.configSchema)) {
      setEditingProvider(config)
      setMode('add')
      return
    }
    createConfig(config)
  }

  const handleAddDefaultInstance = (manifestId: string) => {
    const manifest = manifestById.get(manifestId)
    if (!manifest) {
      return
    }
    const seeded = createDefaultProviderConfig(manifestId, manifest.name)
    if (seeded) {
      createConfig(seeded)
    }
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
        if (!provider.id) {
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

  const handleDeleteManifest = (manifestId: string) => {
    const name = manifestById.get(manifestId)?.name ?? manifestId
    dialog.delete({
      title: t('providers.delete.manifestTitle', 'Delete custom source'),
      content: t(
        'providers.delete.manifestMessage',
        'Delete "{{name}}"? This removes the manifest and its instances; saved danmaku for it can no longer be refreshed.',
        { name }
      ),
      confirmText: t('common.delete', 'Delete'),
      onConfirm: async () => {
        await deleteManifest.mutateAsync(manifestId, {
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
          {reorderMode ? (
            <Button size="small" onClick={() => setReorderMode(false)}>
              {t('providers.installed.reorderDone', 'Done')}
            </Button>
          ) : (
            <ProviderAddMenu
              onAddDanDanPlayProvider={handleAddDanDanPlayProvider}
              onAddMacCmsProvider={handleAddMacCmsProvider}
              onAuthorManifest={handleAuthorManifest}
            />
          )}
        </TabToolbar>
        <TabBody>
          {reorderMode ? (
            <InstalledList
              configs={configs}
              manifestById={manifestById}
              reorderMode
              filterActive={false}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddInstance={handleAddInstance}
              onAddDefaultInstance={handleAddDefaultInstance}
              onViewSource={handleViewSource}
              onDeleteManifest={handleDeleteManifest}
            />
          ) : (
            <Stack direction="column" sx={{ pb: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                sx={{ mb: 1 }}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t(
                  'providers.filter.placeholder',
                  'Filter sources'
                )}
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
              <UpdatesSection
                installedManifestIds={installedManifestIds}
                manifestById={manifestById}
              />
              <NeedsAttentionCallout configs={configs} filter={filter} />
              <SectionHeader
                title={t('providers.installed.title', 'Installed')}
                count={installedCount}
              >
                {configs.length > 1 && !filterActive ? (
                  <Button
                    size="small"
                    startIcon={<SwapVert fontSize="small" />}
                    onClick={() => setReorderMode(true)}
                  >
                    {t('providers.installed.reorder', 'Reorder')}
                  </Button>
                ) : null}
              </SectionHeader>
              <InstalledList
                configs={visibleConfigs}
                manifestById={manifestById}
                reorderMode={false}
                filterActive={filterActive}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddInstance={handleAddInstance}
                onAddDefaultInstance={handleAddDefaultInstance}
                onViewSource={handleViewSource}
                onDeleteManifest={handleDeleteManifest}
              />
              <CatalogSection
                filter={filter}
                installedManifestIds={installedManifestIds}
                onImport={handleImport}
                onDeleteManifest={handleDeleteManifest}
                isImporting={create.isPending}
              />
            </Stack>
          )}
        </TabBody>
      </TabLayout>

      {editingProvider && mode && (
        <ProviderEditor
          mode={mode}
          provider={editingProvider}
          onClose={handleCloseEditor}
        />
      )}
      <Outlet />
    </>
  )
}
