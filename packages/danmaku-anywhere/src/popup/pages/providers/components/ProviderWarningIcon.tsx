import { Warning } from '@mui/icons-material'
import { Tooltip, Typography } from '@mui/material'
import { Trans } from 'react-i18next'
import { ExternalLink } from '@/common/components/ExternalLink'

interface ProviderWarningIconProps {
  warningType: 'bilibili' | 'tencent' | null
}

export const ProviderWarningIcon = ({
  warningType,
}: ProviderWarningIconProps) => {
  if (!warningType) return null

  const getTooltipContent = () => {
    if (warningType === 'bilibili') {
      return (
        <Typography variant="subtitle2">
          {/* @ts-ignore */}
          <Trans i18nKey="danmakuSource.tooltip.bilibiliNotLoggedIn">
            <ExternalLink
              color="primary"
              to="https://www.bilibili.com"
              target="_blank"
              rel="noreferrer"
            />
          </Trans>
        </Typography>
      )
    }

    if (warningType === 'tencent') {
      return (
        <Typography variant="subtitle2">
          {/* @ts-ignore */}
          <Trans i18nKey="danmakuSource.tooltip.tencentCookieMissing">
            <ExternalLink
              color="primary"
              to="https://v.qq.com"
              target="_blank"
              rel="noreferrer"
            />
          </Trans>
        </Typography>
      )
    }

    return null
  }

  return (
    <Tooltip title={getTooltipContent()} placement="top">
      <Warning fontSize="small" color="warning" />
    </Tooltip>
  )
}
