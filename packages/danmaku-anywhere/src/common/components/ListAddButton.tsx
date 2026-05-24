import { Add } from '@mui/icons-material'
import { Button, type ButtonProps } from '@mui/material'

export function ListAddButton(props: ButtonProps) {
  return (
    <Button
      variant="soft"
      color="primary"
      size="xs"
      startIcon={<Add />}
      {...props}
    />
  )
}
