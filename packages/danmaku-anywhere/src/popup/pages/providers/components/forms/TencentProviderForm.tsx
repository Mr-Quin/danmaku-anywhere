import { Stack, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

interface FormValues {
  name: string
}

export const TencentProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps) => {
  const { t } = useTranslation()

  const {
    handleSubmit,
    register,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: { name: provider.name },
  })

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit({ ...provider, name: data.name })
  })

  const handleReset = () => {
    reset()
    onReset?.()
  }

  return (
    <Stack
      component="form"
      onSubmit={handleFormSubmit}
      direction="column"
      spacing={2}
      alignItems="flex-start"
    >
      <TextField
        label={t('providers.editor.name', 'Name')}
        size="small"
        {...register('name')}
        fullWidth
        disabled
        helperText={t(
          'providers.editor.helper.builtInName',
          'Built-in provider names cannot be changed'
        )}
      />

      <FormActions
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onReset={handleReset}
        disableReset={!isDirty}
      />
    </Stack>
  )
}
