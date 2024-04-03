import { Box } from '@mui/material'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { ConfigToolbar } from './ConfigToolbar'
import { MountConfigList } from './MountConfigList'

import type { MountConfig } from '@/common/constants/mountConfig'
import { createMountConfig } from '@/common/constants/mountConfig'

export interface ConfigEditorContext {
  config: MountConfig
  isEdit: boolean
}

export const ConfigPage = () => {
  const [editorContext, setEditorContext] = useState<ConfigEditorContext>(
    () => {
      return {
        config: createMountConfig(''),
        isEdit: false,
      }
    }
  )

  const navigatge = useNavigate()

  const handleEditConfig = (config: MountConfig) => {
    navigatge('edit')
    setEditorContext({
      config,
      isEdit: true,
    })
  }

  const handleAddConfig = () => {
    navigatge('add')
    setEditorContext({
      config: {
        ...createMountConfig(''),
        mediaQuery: 'video',
      },
      isEdit: false,
    })
  }

  return (
    <Box overflow="auto">
      <ConfigToolbar onAdd={handleAddConfig} />
      <MountConfigList onEdit={handleEditConfig} />
      <Outlet context={editorContext} />
    </Box>
  )
}
