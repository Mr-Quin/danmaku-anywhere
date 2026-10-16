import { Box, Button, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ErrorMessage } from '@/common/components/ErrorMessage'
import { useInjectService } from '@/common/hooks/useInjectService'
import { useOptionsReadiness } from '@/common/options/ReadinessService/useOptionsReadiness'
import {
  describeOptionsProblem,
  localizedStoreName,
} from '@/common/options/storeMessages'
import {
  type OptionsUpgrader,
  OptionsUpgraderSymbol,
} from '@/common/options/upgrade/OptionsUpgrader'

export function OptionsUpgradeFailed() {
  const { t } = useTranslation()
  const readiness = useOptionsReadiness()
  const failures = readiness.status === 'failed' ? readiness.stores : []
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
          <>
            {failures.length > 0 && (
              <Box
                component="ul"
                sx={{ m: 0, mt: 1, pl: 2, textAlign: 'left' }}
              >
                {failures.map((failure) => (
                  <Typography
                    component="li"
                    variant="body2"
                    key={failure.store}
                    data-testid="options-upgrade-failed-store"
                    data-store={failure.store}
                  >
                    <strong>{localizedStoreName(failure.store)}</strong>
                    {': '}
                    {describeOptionsProblem(failure.problem)}
                  </Typography>
                ))}
              </Box>
            )}
            <Button
              variant="contained"
              loading={retry.isPending}
              onClick={() => retry.mutate()}
              sx={{ mt: 2 }}
            >
              {t('common.retry', 'Retry')}
            </Button>
          </>
        }
        size={200}
      />
    </Box>
  )
}
