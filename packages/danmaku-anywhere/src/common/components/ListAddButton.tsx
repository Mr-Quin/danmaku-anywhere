import { Add } from '@mui/icons-material'
import { Button, type ButtonProps } from '@mui/material'

export function ListAddButton(props: ButtonProps) {
  return (
    <Button
      variant="soft"
      color="primary"
      size="small"
      startIcon={<Add />}
      sx={{ minHeight: 26, py: 0 }}
      {...props}
    />
  )
}
