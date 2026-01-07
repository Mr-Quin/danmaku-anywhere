import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  type AiProviderConfig,
  AiProviderType,
} from '@/common/options/aiProviderConfig/schema'
import { useAiProviderConfig } from '@/common/options/aiProviderConfig/useAiProviderConfig'
import type { AiConfig } from '@/common/options/mountConfig/schema'

interface AiSettingsFormProps {
  value: AiConfig
  onChange: (value: AiConfig) => void
}

export const AiSettingsForm = ({ value, onChange }: AiSettingsFormProps) => {
  const { t } = useTranslation()
  const { configs } = useAiProviderConfig()

  const handleProviderChange = (
    _: React.SyntheticEvent,
    newValue: AiProviderConfig | null
  ) => {
    if (newValue) {
      onChange({
        ...value,
        providerId: newValue.id,
      })
    }
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      prompt: e.target.value,
    })
  }

  const handleMaxLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value, 10)
    onChange({
      ...value,
      maxInputLength: Number.isNaN(val) ? undefined : val,
    })
  }

  const selectedProvider =
    configs.find((c) => c.id === (value.providerId || 'built-in')) ||
    configs.find((c) => c.provider === AiProviderType.BuiltIn)

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Autocomplete
        options={configs}
        getOptionLabel={(option) => option.name}
        value={selectedProvider}
        onChange={handleProviderChange}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('integration.ai.provider', 'AI Provider')}
            size="small"
            variant="outlined"
          />
        )}
        disableClearable
      />

      <TextField
        label={t('integration.ai.customPrompt', 'Custom Instructions')}
        multiline
        rows={3}
        value={value.prompt || ''}
        onChange={handlePromptChange}
        size="small"
        placeholder={t(
          'integration.ai.customPromptPlaceholder',
          'Add specific instructions for the AI...'
        )}
        helperText={t(
          'integration.ai.customPromptHelper',
          'These instructions will be appended to the system prompt.'
        )}
      />

      <TextField
        label={t('integration.ai.maxInputLength', 'Max Input Length')}
        type="number"
        value={value.maxInputLength || ''}
        onChange={handleMaxLengthChange}
        size="small"
        helperText={t(
          'integration.ai.maxInputLengthHelper',
          'Limit the number of characters sent to AI to save tokens.'
        )}
      />

      <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {t('integration.ai.baseSystemPrompt', 'Base System Prompt:')}
          <br />
          You are a helpful assistant that extracts show title and episode
          number...
        </Typography>
      </Box>
    </Stack>
  )
}
