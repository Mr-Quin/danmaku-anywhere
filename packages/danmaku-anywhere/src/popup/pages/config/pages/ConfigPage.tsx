import { Outlet, useNavigate } from 'react-router'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { useActiveTabInfo } from '@/popup/hooks/useActiveTabInfo'
import { useStore } from '@/popup/store'
import { ConfigToolbar } from '../components/ConfigToolbar'
import { MountConfigList } from '../components/MountConfigList'

export const ConfigPage = () => {
  const { setEditingConfig } = useStore.use.config()
  const navigate = useNavigate()

  const activeTabInfo = useActiveTabInfo()

  const handleEditConfig = (config: MountConfigInput) => {
    navigate('edit')
    setEditingConfig(config)
    getTrackingService().track('editConfig', { config })
  }

  const handleAddConfig = async () => {
    navigate('add')
    if (activeTabInfo) {
      setEditingConfig(
        createMountConfig({
          patterns: [activeTabInfo.pattern],
          name: activeTabInfo.name,
        })
      )
    } else {
      setEditingConfig(createMountConfig())
    }
    getTrackingService().track('addConfig', { data: activeTabInfo })
  }

  return (
    <>
      <TabLayout>
        <ConfigToolbar
          onAdd={handleAddConfig}
          onShowIntegration={() => navigate('integration-policy')}
        />
        <MountConfigList onEdit={handleEditConfig} onAdd={handleAddConfig} />
      </TabLayout>
      <Outlet />
    </>
  )
}
