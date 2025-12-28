import { TextField, type TextFieldProps } from '@mui/material'
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form'

type FormTextFieldProps<T extends FieldValues> = TextFieldProps & {
  name: Path<T>
  control: Control<T>
}

export const FormTextField = <T extends FieldValues>({
  name,
  control,
  ...rest
}: FormTextFieldProps<T>) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...rest}
          {...field}
          error={!!error}
          helperText={error ? error.message : rest.helperText}
          value={field.value || ''}
        />
      )}
    />
  )
}
