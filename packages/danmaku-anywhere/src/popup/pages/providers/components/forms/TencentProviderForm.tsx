import { zodResolver } from '@hookform/resolvers/zod'
import { Stack, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { BuiltInTencentProvider } from '@/common/options/providerConfig/schema'
import { zTencentProviderConfig } from '@/common/options/providerConfig/schema'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

export const TencentProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps<BuiltInTencentProvider>) => {
  const { t } = useTranslation()

  const {
    handleSubmit,
    register,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<BuiltInTencentProvider>({
    resolver: zodResolver(zTencentProviderConfig),
    defaultValues: provider,
  })

  const handleFormSubmit = async (data: BuiltInTencentProvider) => {
    await onSubmit(data)
  }

  const handleReset = () => {
    reset()
    onReset?.()
  }

  return (
    <Stack
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
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
