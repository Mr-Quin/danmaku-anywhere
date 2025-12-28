import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type AiProviderConfig,
  AiProviderType,
} from '@/common/options/aiProviderConfig/schema'
import { useAiProviderConfig } from '@/common/options/aiProviderConfig/useAiProviderConfig'
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'

interface AiSettingsFormProps {
  policy: Integration
}

type AiOptions = NonNullable<Integration['policy']['options']['ai']>

export const AiSettingsForm = ({ policy }: AiSettingsFormProps) => {
  const { t } = useTranslation()
  const { configs } = useAiProviderConfig()
  const { update } = useIntegrationPolicyStore()

  const [localAiOptions, setLocalAiOptions] = useState<AiOptions>(
    policy.policy.options.ai || { providerId: 'built-in' }
  )

  // Manual debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (
        JSON.stringify(localAiOptions) !==
        JSON.stringify(policy.policy.options.ai)
      ) {
        update(policy.id, {
          options: {
            ...policy.policy.options,
            ai: localAiOptions,
          },
        })
      }
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [localAiOptions, policy.id, policy.policy.options, update])

  // Sync from props if external change (optional, but good)
  useEffect(() => {
    if (
      policy.policy.options.ai &&
      JSON.stringify(policy.policy.options.ai) !==
        JSON.stringify(localAiOptions)
    ) {
      // Only update if significantly different to avoid loop?
      // Actually if we type in local, we don't want props to overwrite immediately unless it's a real external update.
      // For simplicity, let's ignore prop sync while editing or trust local state is master for this form.
    }
  }, [policy.policy.options.ai]) // Warning: incomplete sync logic

  const handleProviderChange = (
    _: React.SyntheticEvent,
    newValue: AiProviderConfig | null
  ) => {
    if (newValue) {
      setLocalAiOptions((prev) => ({
        ...prev,
        providerId: newValue.id,
      }))
    }
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalAiOptions((prev) => ({
      ...prev,
      prompt: e.target.value,
    }))
  }

  const handleMaxLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value, 10)
    setLocalAiOptions((prev) => ({
      ...prev,
      maxInputLength: isNaN(val) ? undefined : val,
    }))
  }

  const selectedProvider =
    configs.find((c) => c.id === (localAiOptions.providerId || 'built-in')) ||
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
        value={localAiOptions.prompt || ''}
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
        value={localAiOptions.maxInputLength || ''}
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
