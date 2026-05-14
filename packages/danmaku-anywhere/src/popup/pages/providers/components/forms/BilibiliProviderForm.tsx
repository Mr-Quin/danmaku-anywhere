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
import type { ProviderConfig } from '@/common/options/providerConfig/schema'
import { FormActions } from './FormActions'
import type { ProviderFormProps } from './types'

interface FormValues {
  name: string
  danmakuFormat: 'xml' | 'protobuf'
}

export const BilibiliProviderForm = ({
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
      danmakuFormat:
        (provider.configValues.danmakuFormat as 'xml' | 'protobuf') ?? 'xml',
    },
  })

  const handleFormSubmit = handleSubmit(async (data) => {
    const next: ProviderConfig = {
      ...provider,
      name: data.name,
      configValues: {
        ...provider.configValues,
        danmakuFormat: data.danmakuFormat,
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
      alignItems="flex-start"
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

      <FormControl fullWidth>
        <FormLabel>
          {t(
            'optionsPage.danmakuSource.bilibili.danmakuTypePreference',
            'Danmaku Type Preference'
          )}
        </FormLabel>
        <Controller
          name="danmakuFormat"
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
