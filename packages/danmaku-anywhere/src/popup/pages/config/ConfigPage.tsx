import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { MountConfigList } from './MountConfigList'

import type {
  MountConfig,
  MountConfigWithoutId,
} from '@/common/constants/mountConfig'
import { createMountConfig } from '@/common/constants/mountConfig'
import { getOrigin } from '@/common/utils'
import { useTabUrl } from '@/popup/hooks/useTabUrl'

export const ConfigPage = () => {
  const url = useTabUrl()

  const [editConfig, setEditConfig] = useState<
    MountConfig | MountConfigWithoutId
  >(() => createMountConfig(getOrigin(url)))

  const navigatge = useNavigate()

  const handleEditConfig = (config: MountConfig) => {
    navigatge('add')
    setEditConfig(config)
  }

  const handleAddConfig = () => {
    navigatge('add')
    setEditConfig(createMountConfig(getOrigin(url)))
  }

  return (
    <>
      <MountConfigList onEdit={handleEditConfig} onAdd={handleAddConfig} />
      <Outlet context={editConfig} />
    </>
  )
}
