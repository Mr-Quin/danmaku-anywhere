import { zodResolver } from '@hookform/resolvers/zod'
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
import { useService } from '@/common/hooks/useService'
import type { CustomMacCmsProvider } from '@/common/options/providerConfig/schema'
import { zMacCmsProviderConfig } from '@/common/options/providerConfig/schema'
import { ProviderConfigService } from '@/common/options/providerConfig/service'
import { configQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
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
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CustomMacCmsProvider>({
    resolver: zodResolver(zMacCmsProviderConfig),
    defaultValues: provider,
  })

  const { data: maccmsData } = useQuery({
    queryKey: configQueryKeys.maccms(),
    queryFn: async () => chromeRpcClient.getConfigMacCms(),
    select: (res) => res.data,
  })

  const { data: danmuicuData } = useQuery({
    queryKey: configQueryKeys.danmuicu(),
    queryFn: async () => chromeRpcClient.getConfigDanmuIcu(),
    select: (res) => res.data,
  })

  const providerConfigService = useService(ProviderConfigService)

  const handleFormSubmit = async (data: CustomMacCmsProvider) => {
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

      <Controller
        name="options.danmakuBaseUrl"
        control={control}
        render={({ field: { ref, onChange, ...field } }) => (
          <Autocomplete
            {...field}
            options={maccmsData?.baseUrls ?? []}
            freeSolo
            fullWidth
            onChange={(_, value) => onChange(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={ref}
                label={t(
                  'optionsPage.danmakuSource.macCms.baseUrl',
                  'Mac CMS API Base URL'
                )}
                size="small"
                error={!!errors.options?.danmakuBaseUrl}
                helperText={errors.options?.danmakuBaseUrl?.message}
                required
              />
            )}
          />
        )}
      />

      <Controller
        name="options.danmuicuBaseUrl"
        control={control}
        render={({ field: { ref, onChange, ...field } }) => (
          <Autocomplete
            {...field}
            options={danmuicuData?.baseUrls ?? []}
            freeSolo
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
                error={!!errors.options?.danmuicuBaseUrl}
                helperText={errors.options?.danmuicuBaseUrl?.message}
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
              name="options.stripColor"
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
