import { Checkbox, FormControlLabel } from '@mui/material'
import type { Control, FieldValues, Path } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

interface QuickCheckboxProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
}

export const QuickCheckbox = <T extends FieldValues>({
  control,
  name,
}: QuickCheckboxProps<T>) => {
  const { t } = useTranslation()

  return (
    <FormControlLabel
      control={
        <Controller
          name={name}
          control={control}
          defaultValue={false as any}
          render={({ field: { value, ref, ...field } }) => (
            <Checkbox
              {...field}
              inputRef={ref}
              checked={value}
              color="primary"
              size="small"
            />
          )}
        />
      }
      label={t('integrationPolicyPage.editor.quick', 'Quick')}
      labelPlacement="top"
      slotProps={{
        typography: {
          variant: 'caption',
          color: 'text.secondary',
          sx: {
            mb: -1,
          },
        },
      }}
      sx={{ m: 0 }}
    />
  )
}
