import { zodResolver } from '@hookform/resolvers/zod'
import {
  FormControl,
  FormHelperText,
  FormLabel,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
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
    formState: { isSubmitting, isDirty },
  } = useForm<BuiltInBilibiliProvider>({
    resolver: zodResolver(zBilibiliProviderConfig) as any,
    defaultValues: provider,
  })

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data as BuiltInBilibiliProvider)
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
        {...register('name')}
        fullWidth
        disabled
        helperText={t('providers.editor.helper.builtInName')}
      />

      <FormControl fullWidth>
        <FormLabel>
          {t('optionsPage.danmakuSource.bilibili.danmakuTypePreference')}
        </FormLabel>
        <Controller
          name="options.danmakuTypePreference"
          control={control}
          render={({ field: { ref, ...field } }) => (
            <TextField {...field} size="small" select inputRef={ref} fullWidth>
              <MenuItem value="xml">XML</MenuItem>
              <MenuItem value="protobuf">Protobuf</MenuItem>
            </TextField>
          )}
        />
        <FormHelperText>
          {t(
            'optionsPage.danmakuSource.bilibili.help.danmakuTypePreferenceXML'
          )}
        </FormHelperText>
        <FormHelperText>
          {t(
            'optionsPage.danmakuSource.bilibili.help.danmakuTypePreferenceProtobuf'
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
