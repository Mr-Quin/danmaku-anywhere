import { CheckOutlined, CloseOutlined } from '@mui/icons-material'
import { Alert, Box, Divider, Icon, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { FancyTypography } from '@/common/components/FancyTypography'
import { isConfigPermissive } from '@/common/options/mountConfig/isPermissive'
import { useActiveConfig } from '@/content/controller/common/hooks/useActiveConfig'
import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'
import { IntegrationControl } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/IntegrationControl'

interface StatusIndicatorProps {
  text: string
  active: boolean
  fancy?: boolean
}

const StatusIndicator = ({ text, active, fancy }: StatusIndicatorProps) => {
  return (
    <Stack direction="row" justifyContent="space-between">
      <FancyTypography fancy={fancy}>{text}</FancyTypography>
      <Icon color={active ? 'success' : 'error'}>
        {active ? <CheckOutlined /> : <CloseOutlined />}
      </Icon>
    </Stack>
  )
}

export const IntegrationInfo = () => {
  const { t } = useTranslation()

  const { mediaInfo, active, errorMessage, foundElements } =
    useStore.use.integration()

  const activeIntegration = useActiveIntegration()
  const activeConfig = useActiveConfig()

  const disableAi = activeConfig ? isConfigPermissive(activeConfig) : false

  const renderAiStatus = () => {
    if (disableAi) {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t(
            'integrationPolicyPage.aiDisabledTooPermissive',
            'AI is disabled because the match pattern is too permissive. Please use narrower match pattern or configure XPath integration.'
          )}
        </Alert>
      )
    }
    return (
      <StatusIndicator
        text={t('integrationPolicyPage.aiParsing', 'AI Parsing')}
        active={!!mediaInfo}
        fancy
      />
    )
  }

  return (
    <Box height={1}>
      <Typography mb={1}>
        {activeIntegration
          ? t(
              'integrationPolicyPage.hasIntegration',
              'Using Integration: "{{name}}"',
              {
                name: activeIntegration.name,
              }
            )
          : t(
              'integrationPolicyPage.noIntegration',
              'No integration policy is enabled for this page. Please select from existing policies or create a new one.'
            )}
      </Typography>
      <IntegrationControl />
      <Divider sx={{ mt: 2, mb: 2 }} />
      {activeIntegration && (
        <div>
          {activeIntegration.policy.options.useAI ? (
            renderAiStatus()
          ) : (
            <>
              <StatusIndicator
                text={t('integrationPolicyPage.nodesFound', 'Nodes Found')}
                active={foundElements}
              />
              <StatusIndicator
                text={t(
                  'integrationPolicyPage.parseComplete',
                  'Parse Complete'
                )}
                active={!!mediaInfo}
              />
            </>
          )}
          <Divider sx={{ mt: 2, mb: 2 }} />
          {mediaInfo && (
            <>
              <Typography variant="body2">
                {t('anime.title', 'Title')}: {mediaInfo.seasonTitle}
              </Typography>
              <Typography variant="body2">
                {t('anime.season', 'Season')}:{' '}
                {mediaInfo.seasonDecorator ?? 'NULL'}
              </Typography>
              <Typography variant="body2">
                {t('anime.episode', 'Episode')}: {mediaInfo.episode}
              </Typography>
              <Typography variant="body2">
                {t('anime.episodeTitle', 'Episode Title')}:{' '}
                {mediaInfo.episodeTitle ?? 'NULL'}
              </Typography>
            </>
          )}
          {errorMessage && (
            <>
              <Typography color="error">{errorMessage}</Typography>
            </>
          )}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
        }}
      >
        {active ? (
          <Typography color="success">
            {t('integrationPolicyPage.integrationActive', 'Active')}
          </Typography>
        ) : (
          <Typography color="textDisabled">
            {t('integrationPolicyPage.integrationInactive', 'Inactive')}
          </Typography>
        )}
      </div>
    </Box>
  )
}
