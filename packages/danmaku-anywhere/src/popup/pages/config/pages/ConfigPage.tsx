import { useSuspenseQuery } from '@tanstack/react-query'
import { Outlet, useNavigate } from 'react-router'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { controlQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { useStore } from '@/popup/store'
import { ConfigToolbar } from '../components/ConfigToolbar'
import { MountConfigList } from '../components/MountConfigList'

export const ConfigPage = () => {
  const { setEditingConfig } = useStore.use.config()
  const navigate = useNavigate()

  const { data } = useSuspenseQuery({
    queryFn: async () => {
      // this must not throw for any reason so the page doesn't break
      try {
        const res = await chromeRpcClient.getActiveTabUrl()
        if (!res.data) {
          return ''
        }
        return res.data
      } catch {
        return ''
      }
    },
    queryKey: controlQueryKeys.activeTab(),
    select: (data) => {
      try {
        // try to convert url to a pattern
        // https://www.example.com/abc -> https://www.example.com/*
        const url = new URL(data)
        return {
          url: url.href,
          pattern: url.origin + '/*',
          name: url.origin,
        }
      } catch {
        return null
      }
    },
  })

  const handleEditConfig = (config: MountConfigInput) => {
    navigate('edit')
    setEditingConfig(config)
  }

  const handleAddConfig = async () => {
    navigate('add')
    if (data) {
      setEditingConfig(
        createMountConfig({
          patterns: [data.pattern],
          name: data.name,
        })
      )
    } else {
      setEditingConfig(createMountConfig())
    }
  }

  return (
    <>
      <TabLayout>
        <ConfigToolbar
          onAdd={handleAddConfig}
          onShowIntegration={() => navigate('integration-policy')}
        />
        <MountConfigList onEdit={handleEditConfig} />
      </TabLayout>
      <Outlet />
    </>
  )
}
