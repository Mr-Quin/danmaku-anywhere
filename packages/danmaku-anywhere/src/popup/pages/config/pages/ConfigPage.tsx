import { useSuspenseQuery } from '@tanstack/react-query'
import { Outlet, useNavigate } from 'react-router'

import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { TabLayout } from '@/content/common/TabLayout'
import { MountConfigEditor } from '@/popup/pages/config/pages/MountConfigEditor'
import { useStore } from '@/popup/store'
import { useState } from 'react'
import { ConfigToolbar } from '../components/ConfigToolbar'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { MountConfigList } from '../components/MountConfigList'

export const ConfigPage = () => {
  const { setEditingConfig } = useStore.use.config()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'add' | 'edit'>()

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
    setModal('edit')
    setEditingConfig(config)
  }

  const handleAddConfig = async () => {
    setModal('add')
    setEditingConfig({
      ...createMountConfig(data),
      mediaQuery: 'video',
    })
  }

  return (
    <>
      <TabLayout>
        <ConfigToolbar
          onAdd={handleAddConfig}
          onShowIntegration={() => navigate('integration-policy')}
        />
        <MountConfigList onEdit={handleEditConfig} />
        <ConfirmDeleteDialog />
        <MountConfigEditor
          open={modal === 'add' || modal === 'edit'}
          mode={modal}
          onClose={() => setModal(undefined)}
        />
      </TabLayout>
      <Outlet />
    </>
  )
}
