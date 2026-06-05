import { Warning } from '@mui/icons-material'
import { Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from '@/common/components/ExternalLink'
import type { ProviderCookieSet } from '@/common/rpcClient/background/types'

interface ProviderWarningIconProps {
  testId: string
  cookieSet?: ProviderCookieSet
}

export const ProviderWarningIcon = ({
  testId,
  cookieSet,
}: ProviderWarningIconProps) => {
  const { t } = useTranslation()

  const tooltip = (
    <Typography variant="caption">
      {t('danmakuSource.tooltip.loginRequired')}
      {cookieSet ? (
        <>
          {' '}
          <ExternalLink
            color="primary"
            to={cookieSet.url}
            target="_blank"
            rel="noreferrer"
          >
            {cookieSet.title ?? cookieSet.url}
          </ExternalLink>
        </>
      ) : null}
    </Typography>
  )

  return (
    <Tooltip title={tooltip} placement="top">
      <Warning
        fontSize="small"
        color="warning"
        data-testid={`provider-warning-${testId}`}
      />
    </Tooltip>
  )
}
