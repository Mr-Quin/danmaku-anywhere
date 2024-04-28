import { Outlet, useNavigate } from 'react-router-dom'

import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog'
import { ConfigToolbar } from './ConfigToolbar'
import { MountConfigList } from './MountConfigList'

import type { MountConfig } from '@/common/options/mountConfig/mountConfig'
import { createMountConfig } from '@/common/options/mountConfig/mountConfig'
import { TabLayout } from '@/popup/layout/TabLayout'
import { useStore } from '@/popup/store'

export const ConfigPage = () => {
  const { setEditingConfig } = useStore.use.config()
  const navigate = useNavigate()

  const handleEditConfig = (config: MountConfig) => {
    navigate('edit')
    setEditingConfig(config)
  }

  const handleAddConfig = () => {
    navigate('add')
    setEditingConfig({
      ...createMountConfig(''),
      mediaQuery: 'video',
    })
  }

  return (
    <TabLayout>
      <ConfigToolbar onAdd={handleAddConfig} />
      <MountConfigList onEdit={handleEditConfig} />
      <Outlet />
      <ConfirmDeleteDialog />
    </TabLayout>
  )
}
