import { AutoAwesome, Build, Edit } from '@mui/icons-material'
import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useEditMountConfig } from '@/common/options/mountConfig/useMountConfig'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useStore } from '@/content/controller/store/store'
import { EpisodeInfo } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/EpisodeInfo'
import { MatchingSteps } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/MatchingSteps'
import { IntegrationEditor } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/editor/IntegrationEditor'

export const IntegrationPage = () => {
  const { t } = useTranslation()
  const activeConfig = useActiveConfig()
  const { showEditor, toggleEditor } = useStore.use.integrationForm()
  const { setMode } = useEditMountConfig()

  if (!activeConfig) {
    return (
      <Box p={2}>
        <Typography>
          {t('integration.noConfig', 'No integration config found.')}
        </Typography>
      </Box>
    )
  }

  if (showEditor) {
    return <IntegrationEditor />
  }

  const handleModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: 'ai' | 'custom' | 'manual' | null
  ) => {
    if (newMode && newMode !== activeConfig.mode && activeConfig.id) {
      void setMode({ id: activeConfig.id, mode: newMode })
    }
  }

  return (
    <Box p={2} flexGrow={1} display="flex" flexDirection="column" gap={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <ToggleButtonGroup
          value={activeConfig.mode}
          exclusive
          onChange={handleModeChange}
          aria-label="integration mode"
          fullWidth
          size="small"
        >
          <ToggleButton value="ai">
            <AutoAwesome sx={{ mr: 1 }} />
            {t('integration.mode.ai', 'Auto (AI)')}
          </ToggleButton>
          <ToggleButton value="custom">
            <Build sx={{ mr: 1 }} />
            {t('integration.mode.custom', 'Custom')}
          </ToggleButton>
          <ToggleButton value="manual">
            <Edit sx={{ mr: 1 }} />
            {t('integration.mode.manual', 'Manual')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Button
        startIcon={<Edit />}
        variant="text"
        size="small"
        onClick={() => toggleEditor(true)}
        fullWidth
      >
        {t('integration.openEditor', 'Edit Integration Config')}
      </Button>

      <MatchingSteps />

      <EpisodeInfo />
    </Box>
  )
}
