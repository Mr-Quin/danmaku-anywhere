import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { EXTRACT_TITLE_SYSTEM_PROMPT } from '@/common/ai/prompts'
import { OutlineAccordion } from '@/common/components/OutlineAccordion'
import { useAiProviderConfig } from '@/common/options/aiProviderConfig/useAiProviderConfig'
import {
  DEFAULT_MOUNT_CONFIG_AI_CONFIG,
  type MountConfigAiConfig,
} from '@/common/options/mountConfig/schema'
import { BUILT_IN_AI_PROVIDER_ID } from '../../aiProviderConfig/constant'

interface MountConfigAiSettingsFormProps {
  config?: MountConfigAiConfig
  onChange: (value: MountConfigAiConfig) => void
}

export const MountConfigAiSettingsForm = ({
  config = DEFAULT_MOUNT_CONFIG_AI_CONFIG,
  onChange,
}: MountConfigAiSettingsFormProps) => {
  const { t } = useTranslation()
  const { configs } = useAiProviderConfig()

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...config,
      prompt: e.target.value,
    })
  }

  const selectedProviderId = config.providerId
  const isBuiltIn = selectedProviderId === BUILT_IN_AI_PROVIDER_ID

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        {t(
          'integration.ai.description',
          'AI extracts show information from the current page content.'
        )}
      </Typography>

      <TextField
        value={selectedProviderId}
        label={t('integration.ai.provider', 'AI Provider')}
        select
        onChange={(e) => {
          onChange({
            ...config,
            providerId: e.target.value,
          })
        }}
        slotProps={{
          select: {
            MenuProps: {
              sx: {
                zIndex: 1403,
              },
              disableScrollLock: true,
            },
          },
        }}
        fullWidth
      >
        {configs.map((config) => (
          <MenuItem key={config.id} value={config.id}>
            {config.name}
          </MenuItem>
        ))}
      </TextField>

      {isBuiltIn ? (
        <Alert severity="info">
          {t(
            'integration.ai.cannotEditBuiltIn',
            'Settings for the built-in provider cannot be changed. To use custom prompts, change to another AI provider.'
          )}
        </Alert>
      ) : (
        <>
          <TextField
            label={t('integration.ai.customPrompt', 'Custom Instructions')}
            multiline
            disabled={isBuiltIn}
            rows={3}
            value={config.prompt || ''}
            onChange={handlePromptChange}
            size="small"
            placeholder={t(
              'integration.ai.customPromptPlaceholder',
              'Add custom instruction'
            )}
            helperText={t(
              'integration.ai.customPromptHelper',
              'These instructions will be appended to the system prompt.'
            )}
            fullWidth
          />

          <OutlineAccordion elevation={0} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontSize="0.875rem">
                {t('integration.ai.systemPrompt', 'System Prompt')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                sx={{
                  bgcolor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                }}
              >
                {EXTRACT_TITLE_SYSTEM_PROMPT}
              </Box>
            </AccordionDetails>
          </OutlineAccordion>
        </>
      )}
    </Stack>
  )
}
