import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { zodResolver } from '@hookform/resolvers/zod'
import { MenuItem, Stack, TextField } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
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
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DanDanPlayCompatProvider>({
    resolver: zodResolver(zDanDanPlayCompatibleProviderConfig),
    values: provider,
  })

  const handleFormSubmit = async (data: DanDanPlayCompatProvider) => {
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
      {/* Name field */}
      <TextField
        label={t('providers.editor.name')}
        size="small"
        error={!!errors.name}
        helperText={errors.name?.message}
        {...register('name')}
        fullWidth
        required
      />

      {/* Base URL */}
      <TextField
        label={t('providers.editor.baseUrl')}
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

      {/* Chinese Convert option */}
      <Controller
        name="options.chConvert"
        control={control}
        render={({ field: { ref, ...field } }) => (
          <TextField
            {...field}
            label={t('providers.editor.chConvert')}
            size="small"
            select
            inputRef={ref}
            fullWidth
            helperText={t('providers.editor.helper.chConvert')}
          >
            <MenuItem value={DanDanChConvert.None}>
              {t('providers.chConvert.none')}
            </MenuItem>
            <MenuItem value={DanDanChConvert.Simplified}>
              {t('providers.chConvert.toSimplified')}
            </MenuItem>
            <MenuItem value={DanDanChConvert.Traditional}>
              {t('providers.chConvert.toTraditional')}
            </MenuItem>
          </TextField>
        )}
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
