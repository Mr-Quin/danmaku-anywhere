import { Outlet, useNavigate } from 'react-router-dom'

import { ConfigToolbar } from '../components/ConfigToolbar'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { MountConfigList } from '../components/MountConfigList'

import { createMountConfig } from '@/common/options/mountConfig/constant'
import type { MountConfig } from '@/common/options/mountConfig/schema'
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
