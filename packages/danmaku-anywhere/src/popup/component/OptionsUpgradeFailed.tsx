import { Box, Button } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { useInjectService } from '@/common/hooks/useInjectService'
import {
  type OptionsUpgrader,
  OptionsUpgraderSymbol,
} from '@/common/options/upgrade/OptionsUpgrader'

export function OptionsUpgradeFailed() {
  const { t } = useTranslation()
  const upgrader = useInjectService<OptionsUpgrader>(OptionsUpgraderSymbol)
  const retry = useMutation({
    mutationFn: () => upgrader.upgrade(),
  })

  return (
    <Box
      data-testid="options-upgrade-failed"
      sx={{ height: 1, px: 4, textAlign: 'center' }}
    >
      <ErrorMessage
        message={t(
          'optionsUpgrade.failed',
          'Your settings could not be updated for this version. They have been kept as they were.'
        )}
        action={
          <Button
            variant="contained"
            loading={retry.isPending}
            onClick={() => retry.mutate()}
            sx={{ mt: 2 }}
          >
            {t('common.retry', 'Retry')}
          </Button>
        }
        size={200}
      />
    </Box>
  )
}
