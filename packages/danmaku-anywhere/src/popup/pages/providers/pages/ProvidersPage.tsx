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
import { describeError } from '@/common/errors/describeError'
import { findBuiltinSource } from '@/common/options/providerConfig/builtin'
import {
  createCustomDanDanPlayDraft,
  createCustomMacCmsDraft,
} from '@/common/options/providerConfig/constant'
import { describeProviderConfigError } from '@/common/options/providerConfig/issueText'
import type {
  ProviderConfig,
  ProviderConfigDraft,
} from '@/common/options/providerConfig/schema'
import {
  useEditProviderConfig,
  useProviderConfig,
} from '@/common/options/providerConfig/useProviderConfig'
import { useSourceNames } from '@/common/options/providerConfig/useSourceNames'
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
import {
  useDeleteUserManifest,
  useReinstallManifest,
} from '../hooks/useManifestEditor'
import { useManifestList } from '../hooks/useManifestList'
import { ProviderEditor } from './ProviderEditor'

export const ProvidersPage = (): ReactElement => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast.use.toast()
  const dialog = useDialog()
  const { configs } = useProviderConfig()
  const { nameOf } = useSourceNames()
  const { create, addBuiltin, remove } = useEditProviderConfig()
  const deleteManifest = useDeleteUserManifest()
  const reinstallManifest = useReinstallManifest()
  const { data: manifestData } = useManifestList()
  const [mode, setMode] = useState<'add' | 'edit' | null>(null)
  const [filter, setFilter] = useState('')
  const [reorderMode, setReorderMode] = useState(false)

  const [editingProvider, setEditingProvider] = useState<
    (ProviderConfigDraft & { id?: string }) | null
  >(null)

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
      nameOf(config),
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
    setEditingProvider(createCustomDanDanPlayDraft())
    setMode('add')
  }

  const handleAddMacCmsProvider = () => {
    setEditingProvider(createCustomMacCmsDraft())
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

  const mutationCallbacks = {
    onSuccess: () => {
      toast.success(t('providers.alert.created', 'Source created'))
    },
    onError: (error: Error) => {
      toast.error(describeProviderConfigError(error))
    },
  }

  const handleImport = (manifest: ProviderManifestInfo) => {
    if (findBuiltinSource(manifest.id)) {
      addBuiltin.mutate(manifest.id, mutationCallbacks)
      return
    }
    const draft = createConfigFromManifest(manifest)
    if (manifestNeedsConfigForm(manifest.configSchema)) {
      setEditingProvider(draft)
      setMode('add')
      return
    }
    create.mutate(draft, mutationCallbacks)
  }

  const handleAddDefaultInstance = (manifestId: string) => {
    addBuiltin.mutate(manifestId, mutationCallbacks)
  }

  const handleDelete = (provider: ProviderConfig) => {
    dialog.delete({
      title: t('providers.delete.title', 'Delete Source'),
      content: t(
        'providers.delete.confirm',
        'Delete "{{name}}"? Seasons you follow from it are unfollowed, and its saved seasons can no longer be refreshed. Adding the source again does not bring the follows back.',
        { name: nameOf(provider) }
      ),
      confirmText: t('common.delete', 'Delete'),
      onConfirm: async () => {
        if (!provider.id) {
          return
        }
        await remove.mutateAsync(provider.id, {
          onSuccess: () => {
            toast.success(t('providers.alert.deleted', 'Source deleted'))
          },
          onError: (error) => {
            toast.error(describeProviderConfigError(error))
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
        'providers.delete.manifestConfirm',
        'Delete "{{name}}"? This removes the source manifest and its instances. Seasons you follow from it are unfollowed, and its saved danmaku can no longer be refreshed.',
        { name }
      ),
      confirmText: t('common.delete', 'Delete'),
      onConfirm: async () => {
        await deleteManifest.mutateAsync(manifestId, {
          onSuccess: () => {
            toast.success(t('providers.alert.deleted', 'Source deleted'))
          },
          onError: (error) => {
            toast.error(describeError(error).message)
          },
        })
      },
    })
  }

  const handleReinstallManifest = (manifestId: string) => {
    reinstallManifest.mutate(manifestId, {
      onSuccess: () => {
        toast.success(t('providers.alert.reinstalled', 'Source reinstalled'))
      },
      onError: (error) => {
        toast.error(describeError(error).message)
      },
    })
  }

  return (
    <>
      <TabLayout>
        <TabToolbar title={t('providers.name', 'Danmaku sources')}>
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
              manifestsLoaded={manifestData !== undefined}
              reorderMode
              filterActive={false}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddInstance={handleAddDanDanPlayProvider}
              onAddDefaultInstance={handleAddDefaultInstance}
              onViewSource={handleViewSource}
              onDeleteManifest={handleDeleteManifest}
              onReinstallManifest={handleReinstallManifest}
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
                manifestsLoaded={manifestData !== undefined}
                reorderMode={false}
                filterActive={filterActive}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddInstance={handleAddDanDanPlayProvider}
                onAddDefaultInstance={handleAddDefaultInstance}
                onViewSource={handleViewSource}
                onDeleteManifest={handleDeleteManifest}
                onReinstallManifest={handleReinstallManifest}
              />
              <CatalogSection
                filter={filter}
                installedManifestIds={installedManifestIds}
                onImport={handleImport}
                onDeleteManifest={handleDeleteManifest}
                onReinstallManifest={handleReinstallManifest}
                isImporting={create.isPending || addBuiltin.isPending}
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
