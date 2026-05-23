import { Warning } from '@mui/icons-material'
import { IconButton, Tooltip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface ProviderWarningIconProps {
  cookieSet?: { url: string; title?: string }
}

/**
 * Shown next to a builtin provider row when its loginProbe pipeline reports
 * not-logged-in / cookies-missing. The fix is always "visit the source's
 * own login page so the browser sets cookies normally" — clicking opens
 * cookieSet.url in a new tab. Tooltip text comes from the manifest
 * (cookieSet.title) so the host stays generic.
 */
export function ProviderWarningIcon({ cookieSet }: ProviderWarningIconProps) {
  const { t } = useTranslation()

  const tooltipText =
    cookieSet?.title ??
    t('providers.warning.defaultTooltip', 'Authentication required')

  const handleClick = () => {
    if (!cookieSet?.url) {
      return
    }
    chrome.tabs.create({ url: cookieSet.url })
  }

  const icon = (
    <Warning fontSize="small" color="warning" data-testid="provider-warning" />
  )

  if (!cookieSet?.url) {
    return (
      <Tooltip
        title={<Typography variant="subtitle2">{tooltipText}</Typography>}
      >
        {icon}
      </Tooltip>
    )
  }

  return (
    <Tooltip title={<Typography variant="subtitle2">{tooltipText}</Typography>}>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{ p: 0 }}
        aria-label={tooltipText}
      >
        {icon}
      </IconButton>
    </Tooltip>
  )
}
