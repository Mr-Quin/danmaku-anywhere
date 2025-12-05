import { Folder } from '@mui/icons-material'
import { Stack, Typography } from '@mui/material'
import type { ReactElement } from 'react'

interface FolderTreeItemProps {
  label: string
  childrenCount?: number
}

export const FolderTreeItem = ({
  label,
  childrenCount,
}: FolderTreeItemProps): ReactElement => {
  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        overflow="hidden"
        pr={1}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          overflow="hidden"
        >
          <Folder fontSize="small" />
          <Typography noWrap variant="body2">
            {label}
          </Typography>
          {childrenCount !== undefined && (
            <Typography variant="caption" color="text.secondary">
              ({childrenCount})
            </Typography>
          )}
        </Stack>
      </Stack>
    </>
  )
}
