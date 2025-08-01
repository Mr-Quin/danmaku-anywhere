import { useSuspenseQuery } from '@tanstack/react-query'
import { Outlet, useNavigate } from 'react-router'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { TabLayout } from '@/content/common/TabLayout'
import { useStore } from '@/popup/store'
import { ConfigToolbar } from '../components/ConfigToolbar'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { MountConfigList } from '../components/MountConfigList'

export const ConfigPage = () => {
  const { setEditingConfig } = useStore.use.config()
  const navigate = useNavigate()

  const { data } = useSuspenseQuery({
    queryFn: async () => {
      // this must not throw for any reason so the page doesn't break
      try {
        const res = await chromeRpcClient.getActiveTabUrl()
        if (!res.data) return ''
        return res.data
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
    navigate('edit')
    setEditingConfig(config)
  }

  const handleAddConfig = async () => {
    navigate('add')
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
      </TabLayout>
      <Outlet />
    </>
  )
}
