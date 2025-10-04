import { zodResolver } from '@hookform/resolvers/zod'
import { Stack, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DanDanPlayCompatProvider } from '@/common/options/providerConfig/schema'
import { zDanDanPlayCompatibleProviderConfig } from '@/common/options/providerConfig/schema'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

export const DanDanPlayCompatibleProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps<DanDanPlayCompatProvider>) => {
  const { t } = useTranslation()

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DanDanPlayCompatProvider>({
    resolver: zodResolver(zDanDanPlayCompatibleProviderConfig),
    defaultValues: provider,
  })

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data)
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
        label={t('providers.editor.name')}
        size="small"
        error={!!errors.name}
        helperText={errors.name?.message}
        {...register('name')}
        fullWidth
        required
      />

      <TextField
        label={t('optionsPage.danmakuSource.dandanplay.apiUrl')}
        size="small"
        error={!!errors.options?.baseUrl}
        helperText={
          errors.options?.baseUrl?.message ||
          t('providers.editor.helper.baseUrl')
        }
        {...register('options.baseUrl')}
        fullWidth
        required
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
