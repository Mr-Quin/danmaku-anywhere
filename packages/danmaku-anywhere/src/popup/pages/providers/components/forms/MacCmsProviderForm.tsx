import {
  Autocomplete,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Stack,
  TextField,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  MAX_NAME_LENGTH,
  nameTooLong,
} from '@/common/options/providerConfig/validation'
import { configQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

interface FormValues {
  name: string
  danmakuBaseUrl: string
  danmuicuBaseUrl: string
  stripColor: boolean
}

interface MacCmsConfigValues {
  danmakuBaseUrl?: string
  danmuicuBaseUrl?: string
  stripColor?: boolean
}

export const MacCmsProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps) => {
  const { t } = useTranslation()
  const values = provider.configValues as MacCmsConfigValues

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      name: provider.customName ?? '',
      danmakuBaseUrl: values.danmakuBaseUrl ?? '',
      danmuicuBaseUrl: values.danmuicuBaseUrl ?? '',
      stripColor: values.stripColor ?? false,
    },
  })

  const { data: maccmsData } = useQuery({
    queryKey: configQueryKeys.maccms(),
    queryFn: async () => chromeRpcClient.getConfigMacCms({ force: true }),
    select: (res) => res.data,
  })

  const { data: danmuicuData } = useQuery({
    queryKey: configQueryKeys.danmuicu(),
    queryFn: async () => chromeRpcClient.getConfigDanmuIcu({ force: true }),
    select: (res) => res.data,
  })

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit({
      customName: data.name.trim(),
      configValues: {
        danmakuBaseUrl: data.danmakuBaseUrl,
        danmuicuBaseUrl: data.danmuicuBaseUrl,
        stripColor: data.stripColor,
      },
    })
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
        {...register('name', {
          required: true,
          validate: {
            filled: (value) => value.trim() !== '',
            short: (value) =>
              !nameTooLong(value.trim()) ||
              t(
                'providers.editor.validation.maxLength',
                'Must be at most {{max}} characters',
                { max: MAX_NAME_LENGTH }
              ),
          },
        })}
        fullWidth
        required
      />
      <Controller
        name="danmakuBaseUrl"
        control={control}
        rules={{ required: true }}
        render={({ field: { ref, onChange, ...field } }) => (
          <Autocomplete
            {...field}
            options={maccmsData?.baseUrls ?? []}
            freeSolo
            autoSelect
            fullWidth
            onChange={(_, value) => onChange(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={ref}
                label={t(
                  'optionsPage.danmakuSource.macCms.baseUrl',
                  'VOD API base URL'
                )}
                size="small"
                error={!!errors.danmakuBaseUrl}
                helperText={
                  errors.danmakuBaseUrl?.message ||
                  t(
                    'optionsPage.danmakuSource.macCms.baseUrlHelper',
                    'The options in the list may stop working at any time. You can also enter the URL manually.'
                  )
                }
                required
              />
            )}
          />
        )}
      />
      <Controller
        name="danmuicuBaseUrl"
        control={control}
        rules={{ required: true }}
        render={({ field: { ref, onChange, ...field } }) => (
          <Autocomplete
            {...field}
            options={danmuicuData?.baseUrls ?? []}
            freeSolo
            autoSelect
            fullWidth
            onChange={(_, value) => onChange(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={ref}
                label={t(
                  'optionsPage.danmakuSource.macCms.danmuicuBaseUrl',
                  'Danmaku API Base URL'
                )}
                size="small"
                error={!!errors.danmuicuBaseUrl}
                helperText={errors.danmuicuBaseUrl?.message}
                required
              />
            )}
          />
        )}
      />
      <FormControl>
        <FormControlLabel
          control={
            <Controller
              name="stripColor"
              control={control}
              render={({ field: { value, ref, ...field } }) => (
                <Checkbox
                  {...field}
                  slotProps={{
                    input: {
                      ref,
                    },
                  }}
                  checked={value}
                  color="primary"
                />
              )}
            />
          }
          label={t(
            'optionsPage.danmakuSource.macCms.stripColor',
            'Remove danmaku color'
          )}
          sx={{ m: 0, alignSelf: 'start', color: 'text.secondary' }}
        />
        <FormHelperText>
          {t(
            'optionsPage.danmakuSource.macCms.help.stripColor',
            'Danmaku from this source has random colors, enable this option to set all danmaku to white.'
          )}
        </FormHelperText>
      </FormControl>
      <FormActions
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onReset={handleReset}
        disableReset={!isDirty}
      />
    </Stack>
  )
}
