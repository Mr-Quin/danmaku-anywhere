import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { TabLayout } from '@/content/common/TabLayout'
import { MountConfigEditor } from '@/popup/pages/config/pages/MountConfigEditor'
import { ImportConfigDialog } from '@/popup/pages/config/pages/import/ImportConfigDialog'
import { useStore } from '@/popup/store'
import { useState } from 'react'
import { ConfigToolbar } from '../components/ConfigToolbar'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { MountConfigList } from '../components/MountConfigList'

export const ConfigPage = () => {
  const { setEditingConfig } = useStore.use.config()
  const navigate = useNavigate()
  const [showDialog, setShowDialog] = useState<'edit' | 'import'>()
  const [editType, setEditType] = useState<'add' | 'edit'>('add')
  const [importKind, setImportKind] = useState<'file' | 'repo'>('repo')

  const { data } = useSuspenseQuery({
    queryFn: async () => {
      // this must not throw for any reason so the page doesn't break
      try {
        const res = await chromeRpcClient.getActiveTabUrl()
        return res.data ?? ''
      } catch (_) {
        return ''
      }
    },
    queryKey: controlQueryKeys.activeTab(),
    select: (data) => {
      try {
        // try to convert url to a pattern
        // https://www.example.com/abc -> https://www.example.com/*
        const url = new URL(data)
        return url.origin + '/*'
      } catch (_) {
        // fallback to empty string if the url is invalid
        return ''
      }
    },
  })

  const handleEditConfig = (config: MountConfigInput) => {
    setEditType('edit')
    setShowDialog('edit')
    setEditingConfig(config)
  }

  const handleAddConfig = async () => {
    setEditType('add')
    setShowDialog('edit')
    setEditingConfig({
      ...createMountConfig(data),
      mediaQuery: 'video',
    })
  }

  return (
    <TabLayout>
      <ConfigToolbar
        onOpenAdd={handleAddConfig}
        onOpenImport={(kind) => {
          setImportKind(kind)
          setShowDialog('import')
        }}
        onShowIntegration={() => navigate('integration-policy')}
      />
      <MountConfigList onEdit={handleEditConfig} />
      <ConfirmDeleteDialog />
      <MountConfigEditor
        open={showDialog === 'edit'}
        mode={editType}
        onClose={() => setShowDialog(undefined)}
      />
      <ImportConfigDialog
        open={showDialog === 'import'}
        importKind={importKind}
        onClose={() => setShowDialog(undefined)}
      />
    </TabLayout>
  )
}
