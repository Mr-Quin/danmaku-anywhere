import { DanDanChConvert } from '@danmaku-anywhere/danmaku-provider/ddp'
import { zodResolver } from '@hookform/resolvers/zod'
import { MenuItem, Stack, TextField } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { BuiltInDanDanPlayProvider } from '@/common/options/providerConfig/schema'
import { zDanDanPlayProviderConfig } from '@/common/options/providerConfig/schema'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

export const DanDanPlayProviderForm = ({
  provider,
  onSubmit,
  onReset,
  isEdit,
}: ProviderFormProps<BuiltInDanDanPlayProvider>) => {
  const { t } = useTranslation()

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { isSubmitting },
  } = useForm<BuiltInDanDanPlayProvider>({
    resolver: zodResolver(zDanDanPlayProviderConfig),
    values: provider,
  })

  const handleFormSubmit = async (data: BuiltInDanDanPlayProvider) => {
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
