import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'
import { TabBody } from '@/common/components/layout/TabBody'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfigInput } from '@/common/options/mountConfig/schema'
import { getTrackingService } from '@/common/telemetry/getTrackingService'
import { useActiveTabInfo } from '@/popup/hooks/useActiveTabInfo'
import { useStore } from '@/popup/store'
import { ConfigActions } from '../components/ConfigActions'
import { MountConfigList } from '../components/MountConfigList'

export const ConfigPage = () => {
  const { t } = useTranslation()
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
        <TabToolbar title={t('configPage.name', 'Configs')}>
          <ConfigActions onAdd={handleAddConfig} />
        </TabToolbar>
        <TabBody>
          <MountConfigList onEdit={handleEditConfig} onAdd={handleAddConfig} />
        </TabBody>
      </TabLayout>
      <Outlet />
    </>
  )
}
