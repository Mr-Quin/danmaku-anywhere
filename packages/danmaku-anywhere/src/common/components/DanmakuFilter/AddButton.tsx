import { Button, type ButtonProps } from '@mui/material'

type AddButtonProps = Omit<ButtonProps, 'children'>

/** "+" submit button paired with FilterTextField composers. */
export function AddButton(props: AddButtonProps) {
  const { sx, ...rest } = props
  return (
    <Button
      type="submit"
      variant="contained"
      {...rest}
      sx={[
        { minWidth: 32, height: 32, px: 0 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      +
    </Button>
  )
}
