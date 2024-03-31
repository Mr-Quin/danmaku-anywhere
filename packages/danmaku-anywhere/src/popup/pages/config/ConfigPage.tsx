import { Box, Divider } from '@mui/material'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { ConfigToolbar } from './ConfigToolbar'
import { MountConfigList } from './MountConfigList'

import type { MountConfig } from '@/common/constants/mountConfig'
import { createMountConfig } from '@/common/constants/mountConfig'

export const ConfigPage = () => {
  const [editConfig, setEditConfig] = useState<MountConfig>(() =>
    createMountConfig('')
  )

  const navigatge = useNavigate()

  const handleEditConfig = (config: MountConfig) => {
    navigatge('edit')
    setEditConfig(config)
  }

  const handleAddConfig = () => {
    navigatge('add')
    setEditConfig(createMountConfig(''))
  }

  return (
    <Box>
      <ConfigToolbar onAdd={handleAddConfig} />
      <Divider />
      <MountConfigList onEdit={handleEditConfig} />
      <Outlet context={editConfig} />
    </Box>
  )
}
