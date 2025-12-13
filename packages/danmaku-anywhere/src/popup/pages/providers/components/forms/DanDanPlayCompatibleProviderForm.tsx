import { zodResolver } from '@hookform/resolvers/zod'
import { Remove } from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useService } from '@/common/hooks/useService'
import type { DanDanPlayCompatProvider } from '@/common/options/providerConfig/schema'
import { zDanDanPlayCompatibleProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

export const DanDanPlayCompatibleProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps<DanDanPlayCompatProvider>) => {
  const { t } = useTranslation()

  const providerConfigService = useService(ProviderConfigService)

  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DanDanPlayCompatProvider>({
    resolver: zodResolver(zDanDanPlayCompatibleProviderConfig),
    defaultValues: provider,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options.auth.headers',
  })

  const authEnabled = watch('options.auth.enabled')

  const handleFormSubmit = handleSubmit(async (data) => {
    // Validate ID uniqueness
    const isUnique = await providerConfigService.isIdUnique(
      data.id,
      isEdit ? provider?.id : undefined
    )
    if (!isUnique) {
      setError('id', {
        type: 'manual',
        message: t(
          'providers.editor.error.idExists',
          'This ID is already in use. Please use a different ID'
        ),
      })
      return
    }
    clearErrors('id')
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
        label={t('providers.editor.id', 'ID')}
        size="small"
        error={!!errors.id}
        helperText={
          errors.id?.message ||
          t(
            'providers.editor.helper.id',
            'Unique identifier for this provider. Deleting and recreating with the same ID will reuse previous anime data'
          )
        }
        {...register('id')}
        fullWidth
        required
        disabled={isEdit}
      />

      <TextField
        label={t('providers.editor.name', 'Name')}
        size="small"
        error={!!errors.name}
        helperText={errors.name?.message}
        {...register('name')}
        fullWidth
        required
      />

      <TextField
        label={t('optionsPage.danmakuSource.dandanplay.apiUrl', 'API URL')}
        size="small"
        error={!!errors.options?.baseUrl}
        helperText={
          errors.options?.baseUrl?.message ||
          t(
            'providers.editor.helper.baseUrl',
            'API endpoint URL for DanDanPlay-compatible server'
          )
        }
        {...register('options.baseUrl')}
        fullWidth
        required
      />

      <Box sx={{ width: '100%' }}>
        <FormControlLabel
          control={
            <Checkbox
              {...register('options.auth.enabled')}
              defaultChecked={provider?.options?.auth?.enabled}
            />
          }
          label={t('providers.editor.authEnabled', 'Enable Authentication')}
          sx={{ color: 'text.secondary' }}
        />
      </Box>

      {authEnabled && (
        <Box sx={{ width: '100%' }}>
          <Typography sx={{ mb: 1 }}>
            {t('providers.editor.authHeaders', 'Custom Headers')}
          </Typography>
          <FormHelperText sx={{ mt: 0, mb: 2 }}>
            {t(
              'providers.editor.helper.authHeaders',
              'Custom headers to send with each request (e.g., Authorization, X-AppSecret)'
            )}
          </FormHelperText>

          <Stack spacing={2}>
            {fields.map((field, index) => (
              <Stack
                key={field.id}
                direction="row"
                spacing={1}
                alignItems="flex-start"
              >
                <IconButton onClick={() => remove(index)} size="small">
                  <Remove />
                </IconButton>
                <TextField
                  label={t('providers.editor.headerKey', 'Header Key')}
                  placeholder="X-AppSecret"
                  size="small"
                  error={!!errors.options?.auth?.headers?.[index]?.key}
                  helperText={
                    errors.options?.auth?.headers?.[index]?.key?.message
                  }
                  {...register(`options.auth.headers.${index}.key`)}
                  fullWidth
                  required
                />
                <TextField
                  label={t('providers.editor.headerValue', 'Header Value')}
                  placeholder=""
                  size="small"
                  error={!!errors.options?.auth?.headers?.[index]?.value}
                  helperText={
                    errors.options?.auth?.headers?.[index]?.value?.message
                  }
                  {...register(`options.auth.headers.${index}.value`)}
                  fullWidth
                  required
                />
              </Stack>
            ))}

            <Button
              variant="outlined"
              size="small"
              onClick={() => append({ key: '', value: '' })}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('providers.editor.addHeader', 'Add Header')}
            </Button>
          </Stack>
        </Box>
      )}

      <FormActions
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onReset={handleReset}
        disableReset={!isDirty}
      />
    </Stack>
  )
}
