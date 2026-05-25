import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { MenuItem, Stack, TextField } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

interface FormValues {
  name: string
  chConvert: DanDanChConvert
}

export const DanDanPlayProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps) => {
  const { t } = useTranslation()

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      name: provider.name,
      chConvert:
        (provider.configValues.chConvert as DanDanChConvert) ??
        DanDanChConvert.None,
    },
  })

  const handleFormSubmit = handleSubmit(async (data) => {
    const next: ProviderConfig = {
      ...provider,
      name: data.name,
      configValues: { ...provider.configValues, chConvert: data.chConvert },
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
        {...register('name')}
        fullWidth
        disabled
        helperText={t(
          'providers.editor.helper.builtInName',
          'Built-in provider names cannot be changed'
        )}
      />
      <Controller
        name="chConvert"
        control={control}
        render={({ field: { ref, ...field } }) => (
          <TextField
            {...field}
            label={t(
              'optionsPage.chConvert.name',
              'Simplified/Traditional Conversion'
            )}
            size="small"
            select
            inputRef={ref}
            fullWidth
          >
            <MenuItem value={DanDanChConvert.None}>
              {t('optionsPage.chConvert.none', 'No conversion')}
            </MenuItem>
            <MenuItem value={DanDanChConvert.Simplified}>
              {t('optionsPage.chConvert.simplified', 'Convert to simplified')}
            </MenuItem>
            <MenuItem value={DanDanChConvert.Traditional}>
              {t('optionsPage.chConvert.traditional', 'Convert to traditional')}
            </MenuItem>
          </TextField>
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
