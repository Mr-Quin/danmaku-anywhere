import { ArrowBack, Delete } from '@mui/icons-material'
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material'
import { useOutletContext } from 'react-router-dom'

import type { ConfigEditorContext } from '../ConfigPage'

import { useGoBack } from '@/popup/hooks/useGoBack'

export const ConfigEditorToolbar = ({
  onDelete,
}: {
  onDelete: (name: string) => void
}) => {
  const goBack = useGoBack()

  const { isEdit, config } = useOutletContext<ConfigEditorContext>()

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
        <IconButton edge="start" onClick={goBack}>
          <ArrowBack />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translate(-50%)',
          }}
        >
          {isEdit ? `Edit ${config.name}` : 'Add Mount Config'}
        </Typography>
        {isEdit && (
          <IconButton edge="end" onClick={() => onDelete(config.name)}>
            <Delete />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  )
}
