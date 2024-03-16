import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { MountConfigList } from './MountConfigList'

import type {
  MountConfig,
  MountConfigWithoutId,
} from '@/common/constants/mountConfig'
import { createMountConfig } from '@/common/constants/mountConfig'

export const ConfigPage = () => {
  const [editConfig, setEditConfig] = useState<
    MountConfig | MountConfigWithoutId
  >(() => createMountConfig(''))

  const navigatge = useNavigate()

  const handleEditConfig = (config: MountConfig) => {
    navigatge('add')
    setEditConfig(config)
  }

  const handleAddConfig = () => {
    navigatge('add')
    setEditConfig(createMountConfig(''))
  }

  return (
    <>
      <MountConfigList onEdit={handleEditConfig} onAdd={handleAddConfig} />
      <Outlet context={editConfig} />
    </>
  )
}
