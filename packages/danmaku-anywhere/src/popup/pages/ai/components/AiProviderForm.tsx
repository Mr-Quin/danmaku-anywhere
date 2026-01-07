import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, MenuItem, Stack } from '@mui/material'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormSelect } from '@/common/components/form/FormSelect'
import { FormTextField } from '@/common/components/form/FormTextField'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  type AiProviderConfig,
  AiProviderType,
  zAiProviderConfig,
} from '@/common/options/aiProviderConfig/schema'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

interface AiProviderFormProps {
  provider: AiProviderConfig
  onSubmit: (data: AiProviderConfig) => Promise<void>
  isEdit: boolean
}

export const AiProviderForm = ({
  provider,
  onSubmit,
  isEdit,
}: AiProviderFormProps) => {
  const { t } = useTranslation()
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    watch,
  } = useForm<AiProviderConfig>({
    resolver: zodResolver(zAiProviderConfig) as any,
    defaultValues: provider,
  })

  const providerType = watch('provider')
  const isBuiltIn = providerType === AiProviderType.BuiltIn

  const [isTesting, setIsTesting] = useState(false)
  const toast = useToast.use.toast()
  const values = watch()

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      const result = await chromeRpcClient.testAiProvider(values)
      if (result) {
        toast.success(t('ai.testConnectionSuccess', 'Connection successful'))
      } else {
        toast.error(t('ai.testConnectionFailed', 'Connection failed'))
      }
    } catch (e: any) {
      toast.error(
        t('ai.testConnectionError', 'Error: {{message}}', {
          message: e.message,
        })
      )
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2}>
        <FormTextField
          control={control}
          name="name"
          label={t('common.name', 'Name')}
          required
          disabled={isBuiltIn}
        />

        <FormSelect
          control={control}
          name="provider"
          label={t('ai.providerType', 'Provider Type')}
          disabled={isBuiltIn || isEdit}
        >
          <MenuItem value={AiProviderType.OpenAI}>OpenAI Compatible</MenuItem>
        </FormSelect>

        {!isBuiltIn && (
          <>
            <FormTextField
              control={control}
              name="settings.baseUrl"
              label={t('ai.baseUrl', 'Base URL')}
              helperText={t(
                'ai.baseUrlHelper',
                'e.g. https://api.openai.com/v1'
              )}
            />
            <FormTextField
              control={control}
              name="settings.apiKey"
              label={t('ai.apiKey', 'API Key')}
              type="password"
            />
            <FormTextField
              control={control}
              name="settings.model"
              label={t('ai.model', 'Model')}
              helperText={t('ai.modelHelper', 'e.g. gpt-4, gpt-3.5-turbo')}
            />
          </>
        )}

        <Box display="flex" justifyContent="flex-end" gap={1}>
          {!isBuiltIn && (
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={isTesting || isSubmitting}
            >
              {isTesting
                ? t('common.testing', 'Testing...')
                : t('ai.testConnection', 'Test Connection')}
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={isSubmitting || isTesting}
          >
            {t('common.save', 'Save')}
          </Button>
        </Box>
      </Stack>
    </form>
  )
}
