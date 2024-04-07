import { Outlet, useNavigate } from 'react-router-dom'

import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog'
import { ConfigToolbar } from './ConfigToolbar'
import { MountConfigList } from './MountConfigList'

import type { MountConfig } from '@/common/constants/mountConfig'
import { createMountConfig } from '@/common/constants/mountConfig'
import { TabLayout } from '@/popup/layout/TabLayout'
import { useStore } from '@/popup/store'

export const ConfigPage = () => {
  const { setEditingConfig } = useStore.use.config()
  const navigatge = useNavigate()

  const handleEditConfig = (config: MountConfig) => {
    navigatge('edit')
    setEditingConfig(config)
  }

  const handleAddConfig = () => {
    navigatge('add')
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
