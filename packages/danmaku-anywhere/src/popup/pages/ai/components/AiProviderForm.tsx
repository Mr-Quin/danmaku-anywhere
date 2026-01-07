import { zodResolver } from '@hookform/resolvers/zod'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormSelect } from '@/common/components/form/FormSelect'
import { FormTextField } from '@/common/components/form/FormTextField'
import { RecordEditor } from '@/common/components/form/RecordEditor'
import { OutlineAccordion } from '@/common/components/OutlineAccordion'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  AI_PROVIDER_LIST,
  AiProviderType,
  localizedAiProviderType,
} from '@/common/options/aiProviderConfig/AiProviderType'
import {
  type AiProviderConfig,
  type AiProviderConfigInput,
  zAiProviderConfig,
} from '@/common/options/aiProviderConfig/schema'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { serializeError } from '@/common/utils/serializeError'

interface AiProviderFormProps {
  provider: AiProviderConfigInput
  onSubmit: (data: AiProviderConfig) => Promise<void>
  isEdit: boolean
}

function useTestConnection() {
  const { t } = useTranslation()
  const toast = useToast.use.toast()
  const [isTesting, setIsTesting] = useState(false)

  async function testConnection(config: AiProviderConfigInput) {
    setIsTesting(true)
    try {
      const result = await chromeRpcClient.testAiProvider(config)
      if (result.data.success) {
        toast.success(t('ai.testConnectionSuccess', 'Connection successful'))
      } else {
        toast.error(
          t('ai.testConnectionFailed', 'Connection failed: {{message}}', {
            message: result.data.message,
          })
        )
      }
    } catch (e) {
      toast.error(
        t('ai.testConnectionError', 'Error: {{message}}', {
          message: serializeError(e).message,
        })
      )
    } finally {
      setIsTesting(false)
    }
  }

  return {
    isTesting,
    testConnection,
  }
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
    formState: { isSubmitting, isValid },
    watch,
  } = useForm<AiProviderConfigInput, unknown, AiProviderConfig>({
    resolver: zodResolver(zAiProviderConfig),
    defaultValues: provider,
  })

  const providerType = watch('provider')
  const isBuiltIn = providerType === AiProviderType.BuiltIn

  const config = watch()

  const { isTesting, testConnection } = useTestConnection()

  function handleTestConnection() {
    testConnection(config)
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

        {!isBuiltIn && (
          <>
            <FormSelect
              control={control}
              name="provider"
              label={t('ai.providerType', 'Provider Type')}
              disabled={isBuiltIn || isEdit}
            >
              {AI_PROVIDER_LIST.filter(
                (type) => type !== AiProviderType.BuiltIn
              ).map((type) => (
                <MenuItem key={type} value={type}>
                  {localizedAiProviderType(type)}
                </MenuItem>
              ))}
            </FormSelect>
            <FormTextField
              control={control}
              name="settings.baseUrl"
              required
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
              required
              label={t('ai.model', 'Model')}
              helperText={t('ai.modelHelper', 'e.g. gpt-4, gpt-3.5-turbo')}
            />

            <OutlineAccordion elevation={0} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{t('common.advanced', 'Advanced')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('ai.queryParams', 'Query Params')}
                    </Typography>
                    <Controller
                      control={control}
                      name="settings.queryParams"
                      render={({ field }) => (
                        <RecordEditor
                          value={field.value}
                          onChange={field.onChange}
                          keyLabel="Key"
                          valueLabel="Value"
                          addButtonLabel={t('common.add', 'Add')}
                        />
                      )}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('ai.headers', 'Headers')}
                    </Typography>
                    <Controller
                      control={control}
                      name="settings.headers"
                      render={({ field }) => (
                        <RecordEditor
                          value={field.value}
                          onChange={field.onChange}
                          keyLabel="Header"
                          valueLabel="Value"
                          addButtonLabel={t('common.add', 'Add')}
                        />
                      )}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {t('ai.providerOptions', 'Provider Options')}
                    </Typography>
                    <Controller
                      control={control}
                      name="settings.providerOptions"
                      render={({ field }) => (
                        <RecordEditor
                          value={field.value}
                          onChange={field.onChange}
                          keyLabel="Option"
                          valueLabel="Value (JSON)"
                          addButtonLabel={t('common.add', 'Add')}
                          valueType="json"
                        />
                      )}
                    />
                  </Box>
                </Stack>
              </AccordionDetails>
            </OutlineAccordion>
          </>
        )}

        <Box display="flex" justifyContent="flex-end" gap={1}>
          {!isBuiltIn && (
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={isSubmitting}
              loading={isTesting}
            >
              {t('ai.testConnection', 'Test Connection')}
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            type="submit"
            loading={isSubmitting}
            disabled={isTesting || !isValid}
          >
            {t('common.save', 'Save')}
          </Button>
        </Box>
      </Stack>
    </form>
  )
}
