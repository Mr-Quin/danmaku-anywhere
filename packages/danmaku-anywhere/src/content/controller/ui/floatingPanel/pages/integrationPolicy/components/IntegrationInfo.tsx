import { CheckOutlined, CloseOutlined } from '@mui/icons-material'
import { Box, Button, Divider, Icon, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useActiveIntegration } from '@/content/controller/common/hooks/useActiveIntegration'
import { useStore } from '@/content/controller/store/store'

interface StatusIndicatorProps {
  text: string
  active: boolean
}

const StatusIndicator = ({ text, active }: StatusIndicatorProps) => {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography>{text}</Typography>
      <Icon color={active ? 'success' : 'error'}>
        {active ? <CheckOutlined /> : <CloseOutlined />}
      </Icon>
    </Stack>
  )
}

export const IntegrationInfo = () => {
  const { t } = useTranslation()

  const { toggleEditor } = useStore.use.integrationForm()
  const { mediaInfo, active, errorMessage, foundElements } =
    useStore.use.integration()

  const activeIntegration = useActiveIntegration()

  return (
    <Box height={1}>
      <Typography>
        {activeIntegration
          ? t('integrationPolicyPage.hasIntegration', {
              name: activeIntegration.name,
            })
          : t('integrationPolicyPage.noIntegration')}
      </Typography>
      <Button variant="contained" onClick={() => toggleEditor()}>
        {activeIntegration
          ? t('integrationPolicyPage.edit', {
              name: activeIntegration.name,
            })
          : t('integrationPolicyPage.create')}
      </Button>
      <Divider sx={{ mt: 2, mb: 2 }} />
      {activeIntegration && (
        <div>
          <StatusIndicator
            text={t('integrationPolicyPage.nodesFound')}
            active={foundElements}
          />
          <StatusIndicator
            text={t('integrationPolicyPage.parseComplete')}
            active={!!mediaInfo}
          />
          <Divider sx={{ mt: 2, mb: 2 }} />
          {mediaInfo && (
            <>
              <Typography variant="body2">
                {t('anime.title')}: {mediaInfo.title}
              </Typography>
              <Typography variant="body2">
                {t('anime.season')}: {mediaInfo.season ?? 'NULL'}
              </Typography>
              <Typography variant="body2">
                {t('anime.episode')}: {mediaInfo.episode}
              </Typography>
              <Typography variant="body2">
                {t('anime.episodeTitle')}: {mediaInfo.episodeTitle ?? 'NULL'}
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
            {t('integrationPolicyPage.integrationActive')}
          </Typography>
        ) : (
          <Typography color="textDisabled">
            {t('integrationPolicyPage.integrationInactive')}
          </Typography>
        )}
      </div>
    </Box>
  )
}
