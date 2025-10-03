import { zodResolver } from '@hookform/resolvers/zod'
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { CustomMacCmsProvider } from '@/common/options/providerConfig/schema'
import { zMacCmsProviderConfig } from '@/common/options/providerConfig/schema'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

export const MacCmsProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps<CustomMacCmsProvider>) => {
  const { t } = useTranslation()

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomMacCmsProvider>({
    resolver: zodResolver(zMacCmsProviderConfig),
    values: provider,
  })

  const handleFormSubmit = async (data: CustomMacCmsProvider) => {
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

      {/* Danmaku Base URL */}
      <TextField
        label={t('providers.editor.danmakuBaseUrl')}
        size="small"
        error={!!errors.options?.danmakuBaseUrl}
        helperText={
          errors.options?.danmakuBaseUrl?.message ||
          t('providers.editor.helper.danmakuBaseUrl')
        }
        {...register('options.danmakuBaseUrl')}
        fullWidth
        required
      />

      {/* Danmuicu Base URL */}
      <TextField
        label={t('providers.editor.danmuicuBaseUrl')}
        size="small"
        error={!!errors.options?.danmuicuBaseUrl}
        helperText={
          errors.options?.danmuicuBaseUrl?.message ||
          t('providers.editor.helper.danmuicuBaseUrl')
        }
        {...register('options.danmuicuBaseUrl')}
        fullWidth
        required
      />

      {/* Strip Color option */}
      <FormControl>
        <FormControlLabel
          control={
            <Controller
              name="options.stripColor"
              control={control}
              render={({ field: { value, ref, ...field } }) => (
                <Checkbox
                  {...field}
                  inputRef={ref}
                  checked={value}
                  color="primary"
                />
              )}
            />
          }
          label={t('providers.editor.stripColor')}
        />
      </FormControl>

      <FormActions
        control={control}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onReset={handleReset}
      />
    </Stack>
  )
}
