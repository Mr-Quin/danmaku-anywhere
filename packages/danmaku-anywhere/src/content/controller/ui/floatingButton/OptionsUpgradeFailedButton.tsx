import { ErrorOutlined } from '@mui/icons-material'
import { Fab, Tooltip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

// Stands in for the floating button while the options upgrade has failed. The
// controller cannot work until it succeeds, and the popup is where to retry.
export function OptionsUpgradeFailedButton() {
  const { t } = useTranslation()
  const label = t(
    'optionsUpgrade.openToRetry',
    'Danmaku Anywhere could not update its settings. Open it to try again.'
  )

  return (
    <Tooltip title={label} placement="right">
      <Fab
        color="error"
        size="medium"
        aria-label={label}
        data-testid="options-upgrade-failed-button"
        onClick={() => {
          void chromeRpcClient.openPopupInNewWindow({ path: '' })
        }}
        sx={{ position: 'fixed', left: 32, bottom: 128, zIndex: 1401 }}
      >
        <ErrorOutlined />
      </Fab>
    </Tooltip>
  )
}
