import { Movie, Settings, SmartToy, Title } from '@mui/icons-material'
import {
  Box,
  Button,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'
import { type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useImportShareCodeDialog } from '@/common/options/combinedPolicy/useImportShareCodeDialog'
import { isConfigPermissive } from '@/common/options/mountConfig/isPermissive'
import { useActiveConfig } from '@/content/controller/common/context/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/context/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'

interface StepData {
  label: string
  icon: () => ReactNode
  completed: boolean
  error: boolean
  description?: string | false
  renderContent?: () => ReactNode
}

function getActiveStep(steps: StepData[]) {
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
  const videoId = useStore.use.videoId?.()
  const { toggleEditor } = useStore.use.integrationForm()
  const { mediaInfo, foundElements, errorMessage, active } =
    useStore.use.integration()
  const activeIntegration = useActiveIntegration()
  const openImportDialog = useImportShareCodeDialog({
    type: 'integration',
    configId: activeConfig.id,
  })

  const steps = useMemo<StepData[]>(() => {
    const isPermissive = isConfigPermissive(activeConfig)
    const isAiMode = activeConfig.mode === 'ai'

    const checkIntegrationStep = {
      label: t('integration.steps.configAvailable', 'Integration Available'),
      icon: () => <Settings />,
      completed: !!activeIntegration,
      error: !activeIntegration,
      description: activeIntegration
        ? t('integration.steps.configAvailablePass', 'Integration is available')
        : t(
            'integration.steps.configAvailableFail',
            'Integration is not configured.'
          ),
      renderContent: () => {
        if (activeIntegration) {
          return (
            <Button
              variant="contained"
              size="small"
              onClick={() => toggleEditor(true)}
              sx={{ mt: 1 }}
              fullWidth
            >
              {t('integration.editConfig', 'Edit Integration')}
            </Button>
          )
        }
        return (
          <Stack direction="row" alignItems="center" spacing={1} mt={1}>
            <Button
              variant="contained"
              size="small"
              onClick={() => toggleEditor(true)}
              sx={{ mt: 2 }}
            >
              {t('integration.createConfig', 'Create Integration')}
            </Button>
            <Typography variant="body2" fontSize="small" color="textSecondary">
              {t('mountPage.or', 'or')}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => openImportDialog()}
              sx={{ mt: 2 }}
            >
              {t('configPage.importShareCode', 'Import Share Code')}
            </Button>
          </Stack>
        )
      },
    }

    const checkAiStep = {
      label: t('integration.steps.enableAi', 'Enable AI'),
      icon: () => <SmartToy />,
      completed: isAiMode,
      error: !isAiMode,
      description: t('integration.steps.enableAiPass', 'AI is enabled'),
    }

    const configPermissiveStep = {
      label: t(
        'integration.steps.checkMountConfigPermissive',
        'Check Mount Config'
      ),
      icon: () => <SmartToy />,
      completed: !isPermissive,
      error: isPermissive,
      description:
        isPermissive &&
        t(
          'integration.steps.checkMountConfigPermissiveFail',
          'Mount config is too permissive, please change the pattern to be more restrictive.'
        ),
    }

    const hasVideo = !!videoId

    const checkVideoStep = {
      label: t('integration.steps.checkVideo', 'Check Video'),
      icon: () => <Movie />,
      completed: hasVideo,
      error: !hasVideo,
      description: hasVideo
        ? t('integration.steps.checkVideoPass', 'Video is detected')
        : t('integration.steps.checkVideoFail', 'Video is not detected'),
    }

    const integrationEnabledStep = {
      label: t(
        'integration.steps.integrationEnabled',
        'Automatic Mode Enabled'
      ),
      icon: () => <SmartToy />,
      completed: !!active,
      error: !active,
      description: active
        ? t(
            'integration.steps.integrationEnabledPass',
            'Automatic mode is enabled'
          )
        : t(
            'integration.steps.integrationEnabledFail',
            'Automatic mode is disabled'
          ),
    }

    const aiRequestStep = {
      label: t('integration.steps.aiRequest', 'AI Request'),
      icon: () => <SmartToy />,
      completed: !!mediaInfo,
      error: !!errorMessage,
      description: errorMessage
        ? errorMessage
        : t('integration.steps.aiRequestPass', 'AI request is successful'),
    }

    const matchNodesStep = {
      label: t('integration.steps.matchNodes', 'Match Nodes'),
      icon: () => <SmartToy />,
      completed: foundElements,
      error: !foundElements,
      description: foundElements
        ? t('integration.steps.matchNodesPass', 'Nodes matching is successful')
        : t('integration.steps.matchNodesFail', 'Nodes matching failed'),
    }

    const extractMediaInfoStep = {
      label: t('integration.steps.parseMediaInfo', 'Parse Media Info'),
      icon: () => <Title />,
      completed: !!mediaInfo,
      error: !!errorMessage,
      description: errorMessage
        ? errorMessage
        : t(
            'integration.steps.parseMediaInfoPass',
            'Media info parsing is successful'
          ),
    }

    const mediaInfoStep = {
      label: t('integration.steps.mediaInfo', 'Media Info'),
      icon: () => <Title />,
      completed: !!mediaInfo,
      error: !!errorMessage,
      description: mediaInfo?.toString() || '',
    }

    if (isAiMode) {
      return [
        checkAiStep,
        configPermissiveStep,
        checkVideoStep,
        integrationEnabledStep,
        aiRequestStep,
        mediaInfoStep,
      ]
    }

    return [
      checkIntegrationStep,
      checkVideoStep,
      integrationEnabledStep,
      matchNodesStep,
      extractMediaInfoStep,
      mediaInfoStep,
    ]
  }, [
    t,
    activeIntegration,
    videoId,
    activeConfig,
    active,
    isConfigPermissive,
    mediaInfo,
    foundElements,
    errorMessage,
  ])

  const activeStep = getActiveStep(steps)

  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, i) => (
          <Step key={step.label} expanded={i <= activeStep}>
            <StepLabel error={step.error && i <= activeStep}>
              {step.label}
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
              {step.renderContent?.()}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  )
}
