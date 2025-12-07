import { Movie, Settings, SmartToy, Title } from '@mui/icons-material'
import {
  Box,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { isConfigPermissive } from '@/common/options/mountConfig/isPermissive'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'

function getActiveStep(steps: { completed: boolean }[]) {
  let activeStep = 0
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].completed) {
      activeStep = i + 1
    } else {
      break
    }
  }
  return activeStep
}

export const MatchingSteps = () => {
  const { t } = useTranslation()
  const activeConfig = useActiveConfig()
  const hasVideo = useStore.use.hasVideo()
  const { mediaInfo, foundElements, errorMessage } = useStore.use.integration()
  const activeIntegration = useActiveIntegration()

  const disableAi = activeConfig ? isConfigPermissive(activeConfig) : false
  const isAiMode = activeConfig?.mode === 'ai'

  const steps = useMemo(() => {
    const hasIntegrationStep = {
      label: t('integration.steps.config', 'Integration Available'),
      icon: <Settings />,
      completed: !!activeIntegration,
      error: !activeIntegration,
      description: activeIntegration
        ? undefined
        : t(
            'integration.steps.noConfig',
            'Integration is not configured, please create one.'
          ),
    }

    const hasAiStep = {
      label: t('integration.steps.ai', 'AI Integration'),
      icon: <SmartToy />,
      completed: !!mediaInfo,
      error: !!errorMessage,
      description: errorMessage || (mediaInfo ? mediaInfo.seasonTitle : ''),
    }

    const configPermissiveStep = {
      label: t('integration.steps.permissive', 'Config Permissive'),
      icon: <SmartToy />,
      completed: !!mediaInfo,
      error: !!errorMessage,
      description: disableAi
        ? t('integration.steps.aiDisabled', 'AI disabled (too permissive)')
        : t('integration.steps.aiMatching', 'AI is analyzing page content...'),
    }

    const hasVideoStep = {
      label: t('integration.steps.video', 'Video Detected'),
      icon: <Movie />,
      completed: hasVideo(),
      error: !hasVideo(),
      description: t(
        'integration.steps.videoDesc',
        'A video element must be present on the page.'
      ),
    }

    const matchElementsStep = {
      label: t('integration.steps.match', 'Elements Matched'),
      icon: <SmartToy />,
      completed: foundElements,
      error: !foundElements,
      description: t(
        'integration.steps.rulesMatching',
        'Matching elements based on rules...'
      ),
    }
    const parsedStep = {
      label: t('integration.steps.parsed', 'Info Parsed'),
      icon: <Title />,
      completed: !!mediaInfo,
      error: !!errorMessage,
      description: errorMessage || (mediaInfo ? mediaInfo.seasonTitle : ''),
    }

    if (isAiMode) {
      return [hasAiStep, configPermissiveStep, hasVideoStep]
    }

    return [hasIntegrationStep, hasVideoStep, matchElementsStep, parsedStep]
  }, [activeIntegration, hasVideo, isAiMode, mediaInfo, foundElements])

  return (
    <Box sx={{ maxWidth: 400 }}>
      <Stepper activeStep={getActiveStep(steps)} orientation="vertical">
        {steps.map((step) => (
          <Step key={step.label}>
            <StepLabel error={step.error}>{step.label}</StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  )
}
