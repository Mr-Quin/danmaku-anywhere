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
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BuiltInTencentProvider>({
    resolver: zodResolver(zTencentProviderConfig),
    values: provider,
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
      {/* Name field - readonly for built-in providers */}
      <TextField
        label={t('providers.editor.name')}
        size="small"
        {...register('name')}
        fullWidth
        disabled
        helperText={t('providers.editor.helper.builtInName')}
      />

      {/* Limit Per Min */}
      <TextField
        label={t('providers.editor.limitPerMin')}
        size="small"
        type="number"
        error={!!errors.options?.limitPerMin}
        helperText={
          errors.options?.limitPerMin?.message ||
          t('providers.editor.helper.limitPerMin')
        }
        {...register('options.limitPerMin', {
          valueAsNumber: true,
        })}
        fullWidth
      />

      <FormActions
        control={control}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onReset={handleReset}
      />
    </Stack>
  )
}
