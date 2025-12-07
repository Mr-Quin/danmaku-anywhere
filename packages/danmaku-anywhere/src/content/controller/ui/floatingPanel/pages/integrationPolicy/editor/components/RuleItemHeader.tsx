import { Delete } from '@mui/icons-material'
import { IconButton, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface RuleItemHeaderProps {
  index: number
  onDelete: () => void
  children?: ReactNode
}

export const RuleItemHeader = ({
  index,
  onDelete,
  children,
}: RuleItemHeaderProps) => {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="subtitle2" color="text.secondary">
        #{index + 1}
      </Typography>
      <div>
        {children}
        <IconButton onClick={onDelete} size="small">
          <Delete fontSize="small" />
        </IconButton>
      </div>
    </Stack>
  )
}
