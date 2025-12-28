import { TextField, type TextFieldProps } from '@mui/material'
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form'

type FormSelectProps<T extends FieldValues> = TextFieldProps & {
  name: Path<T>
  control: Control<T>
  children: React.ReactNode
}

export const FormSelect = <T extends FieldValues>({
  name,
  control,
  children,
  ...rest
}: FormSelectProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...rest}
          {...field}
          select
          error={!!error}
          helperText={error ? error.message : rest.helperText}
          value={field.value || ''}
        >
          {children}
        </TextField>
      )}
    />
  )
}
