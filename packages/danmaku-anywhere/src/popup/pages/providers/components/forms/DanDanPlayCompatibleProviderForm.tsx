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
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

interface FormValues {
  name: string
  baseUrl: string
  auth: {
    enabled: boolean
    headers: { key: string; value: string }[]
  }
}

interface DdpCompatConfigValues {
  baseUrl?: string
  auth?: { enabled?: boolean; headers?: { key: string; value: string }[] }
}

export const DanDanPlayCompatibleProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps) => {
  const { t } = useTranslation()

  const values = provider.configValues as DdpCompatConfigValues

  const {
    handleSubmit,
    register,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      name: provider.name,
      baseUrl: values.baseUrl ?? '',
      auth: {
        enabled: values.auth?.enabled ?? false,
        headers: values.auth?.headers ?? [],
      },
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'auth.headers',
  })

  const authEnabled = watch('auth.enabled')

  const handleFormSubmit = handleSubmit(async (data) => {
    const next: ProviderConfig = {
      ...provider,
      name: data.name,
      configValues: {
        baseUrl: data.baseUrl,
        auth: data.auth,
      },
    }
    await onSubmit(next)
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
      sx={{
        alignItems: 'flex-start',
      }}
    >
      <TextField
        label={t('providers.editor.name', 'Name')}
        size="small"
        error={!!errors.name}
        helperText={errors.name?.message}
        {...register('name', { required: true })}
        fullWidth
        required
      />
      <TextField
        label={t('optionsPage.danmakuSource.dandanplay.apiUrl', 'API URL')}
        size="small"
        error={!!errors.baseUrl}
        helperText={
          errors.baseUrl?.message ||
          t(
            'providers.editor.helper.baseUrl',
            'API endpoint URL for DanDanPlay-compatible server. Leave empty to use the proxy-backed DanDanPlay manifest.'
          )
        }
        {...register('baseUrl')}
        fullWidth
      />
      <Box sx={{ width: '100%' }}>
        <FormControlLabel
          control={<Checkbox {...register('auth.enabled')} />}
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
                sx={{
                  alignItems: 'flex-start',
                }}
              >
                <IconButton onClick={() => remove(index)} size="small">
                  <Remove />
                </IconButton>
                <TextField
                  label={t('providers.editor.headerKey', 'Header Key')}
                  placeholder="X-AppSecret"
                  size="small"
                  error={!!errors.auth?.headers?.[index]?.key}
                  helperText={errors.auth?.headers?.[index]?.key?.message}
                  {...register(`auth.headers.${index}.key`, { required: true })}
                  fullWidth
                  required
                />
                <TextField
                  label={t('providers.editor.headerValue', 'Header Value')}
                  placeholder=""
                  size="small"
                  error={!!errors.auth?.headers?.[index]?.value}
                  helperText={errors.auth?.headers?.[index]?.value?.message}
                  {...register(`auth.headers.${index}.value`, {
                    required: true,
                  })}
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
