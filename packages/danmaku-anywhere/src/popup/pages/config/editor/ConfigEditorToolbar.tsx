import { Delete } from '@mui/icons-material'
import { IconButton } from '@mui/material'
import { useOutletContext } from 'react-router-dom'

import type { ConfigEditorContext } from '../ConfigPage'

import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'

export const ConfigEditorToolbar = ({
  onDelete,
}: {
  onDelete: (name: string) => void
}) => {
  const { isEdit, config } = useOutletContext<ConfigEditorContext>()

  return (
    <OptionsPageToolBar
      title={isEdit ? `Edit ${config.name}` : 'Add Mount Config'}
      rightElement={
        isEdit && (
          <IconButton edge="end" onClick={() => onDelete(config.name)}>
            <Delete />
          </IconButton>
        )
      }
    />
  )
}
