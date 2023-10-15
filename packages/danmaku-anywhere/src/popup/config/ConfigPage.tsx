import { Box, Paper, Slide } from '@mui/material'

import { useState } from 'react'
import { useStore } from '../store'
import { MountConfigEditor } from './MountConfigEditor'
import { MountConfigList } from './MountConfigList'
import {
  MountConfig,
  MountConfigWithoutId,
  createMountConfig,
} from '@/common/constants'
import { getOrigin } from '@/common/utils'

export const ConfigPage = () => {
  const [showEditor, setShowEditor] = useState(false)
  const [editConfig, setEditConfig] = useState<
    MountConfig | MountConfigWithoutId | null
  >(null)

  const url = useStore((state) => state.tabUrl)

  const handleEditConfig = (config: MountConfig) => {
    setEditConfig(config)
    setShowEditor(true)
  }

  const handleAddConfig = () => {
    setEditConfig(createMountConfig(getOrigin(url)))
    setShowEditor(true)
  }

  return (
    <>
      <MountConfigList onEdit={handleEditConfig} onAdd={handleAddConfig} />
      <Box position="absolute" top={0} zIndex={1} width={1}>
        <Slide direction="up" in={showEditor} mountOnEnter unmountOnExit>
          <Paper sx={{ height: '100vh' }}>
            <MountConfigEditor
              editConfig={editConfig!}
              goBack={() => {
                setShowEditor(false)
              }}
            />
          </Paper>
        </Slide>
      </Box>
    </>
  )
}
