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

  // cookieSet.url comes from a manifest (including user-registered ones); only
  // render it as a link when it is a real web URL, not a javascript:/data: scheme.
  const linkUrl =
    cookieSet && /^https?:\/\//i.test(cookieSet.url) ? cookieSet.url : undefined

  const tooltip = (
    <Typography variant="caption">
      {t('danmakuSource.tooltip.loginRequired')}
      {linkUrl ? (
        <>
          {' '}
          <ExternalLink
            color="primary"
            to={linkUrl}
            target="_blank"
            rel="noreferrer"
          >
            {cookieSet?.title ?? linkUrl}
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
