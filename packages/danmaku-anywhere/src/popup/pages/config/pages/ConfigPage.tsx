import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'
import { ListPageLayout } from '@/common/components/layout/ListPageLayout'
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
      <ListPageLayout
        title={t('configPage.name', 'Configs')}
        action={<ConfigActions onAdd={handleAddConfig} />}
      >
        <MountConfigList onEdit={handleEditConfig} onAdd={handleAddConfig} />
      </ListPageLayout>
      <Outlet />
    </>
  )
}
