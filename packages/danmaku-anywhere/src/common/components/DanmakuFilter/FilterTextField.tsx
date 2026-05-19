import { TextField, type TextFieldProps } from '@mui/material'
import { withStopPropagation } from '@/common/utils/withStopPropagation'

/**
 * Small TextField preset shared across the Filter page composers, inline
 * editor, and tester. Height 32, small placeholder font, key events stopped
 * so typing inside the player overlay doesn't trigger video shortcuts.
 */
export function FilterTextField(props: TextFieldProps) {
  const { sx, ...rest } = props
  return (
    <TextField
      size="small"
      {...withStopPropagation()}
      {...rest}
      sx={[
        {
          '& .MuiInputBase-root': { height: 32 },
          '& input::placeholder': { fontSize: 'small' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}
