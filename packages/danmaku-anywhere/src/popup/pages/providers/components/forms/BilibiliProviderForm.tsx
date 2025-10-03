import { zodResolver } from '@hookform/resolvers/zod'
import { MenuItem, Stack, TextField } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { BuiltInBilibiliProvider } from '@/common/options/providerConfig/schema'
import { zBilibiliProviderConfig } from '@/common/options/providerConfig/schema'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

export const BilibiliProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps<BuiltInBilibiliProvider>) => {
  const { t } = useTranslation()

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BuiltInBilibiliProvider>({
    resolver: zodResolver(zBilibiliProviderConfig),
    values: provider,
  })

  const handleFormSubmit = async (data: BuiltInBilibiliProvider) => {
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

      {/* Danmaku Type Preference */}
      <Controller
        name="options.danmakuTypePreference"
        control={control}
        render={({ field: { ref, ...field } }) => (
          <TextField
            {...field}
            label={t('providers.editor.danmakuTypePreference')}
            size="small"
            select
            inputRef={ref}
            fullWidth
            helperText={t('providers.editor.helper.danmakuTypePreference')}
          >
            <MenuItem value="xml">XML</MenuItem>
            <MenuItem value="protobuf">Protobuf</MenuItem>
          </TextField>
        )}
      />

      {/* Protobuf Limit Per Min */}
      <TextField
        label={t('providers.editor.protobufLimitPerMin')}
        size="small"
        type="number"
        error={!!errors.options?.protobufLimitPerMin}
        helperText={
          errors.options?.protobufLimitPerMin?.message ||
          t('providers.editor.helper.protobufLimitPerMin')
        }
        {...register('options.protobufLimitPerMin', {
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
