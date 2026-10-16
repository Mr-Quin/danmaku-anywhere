import { Box, Button, Stack, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { GlobalDialog } from '@/common/components/Dialog/GlobalDialog'
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
import { recoveryFileName } from '@/common/options/upgrade/recoveryCopy'
import { createDownload } from '@/common/utils/utils'

export function OptionsUpgradeFailed() {
  const { t } = useTranslation()
  const dialog = useDialog()
  const readiness = useOptionsReadiness()
  const failures = readiness.status === 'failed' ? readiness.stores : []
  const upgrader = useInjectService<OptionsUpgrader>(OptionsUpgraderSymbol)
  const retry = useMutation({
    mutationFn: () => upgrader.upgrade(),
  })
  const reset = useMutation({
    mutationFn: async (store: string) => {
      const copy = await upgrader.resetStore(store)
      const file = new Blob([JSON.stringify(copy, null, 2)], {
        type: 'application/json',
      })
      await createDownload(file, recoveryFileName(copy))
    },
  })

  function confirmReset(store: string) {
    const name = localizedStoreName(store)
    dialog.confirm({
      title: t('optionsUpgrade.reset.title', 'Reset {{name}}?', { name }),
      content: t(
        'optionsUpgrade.reset.description',
        'What is saved in {{name}} now is kept as a recovery copy and downloaded as a file. Then {{name}} goes back to the defaults.',
        { name }
      ),
      confirmText: t('optionsUpgrade.reset.confirm', 'Reset'),
      onConfirm: async () => {
        await reset.mutateAsync(store)
      },
    })
  }

  return (
    <Box
      data-testid="options-upgrade-failed"
      sx={{ height: 1, px: 4, textAlign: 'center' }}
    >
      <GlobalDialog />
      <ErrorMessage
        message={t(
          'optionsUpgrade.failed',
          'Your settings could not be updated for this version. They have been kept as they were.'
        )}
        action={
          <>
            {failures.length > 0 && (
              <Stack component="ul" spacing={1} sx={{ m: 0, mt: 1, p: 0 }}>
                {failures.map((failure) => (
                  <Stack
                    component="li"
                    direction="row"
                    spacing={1}
                    key={failure.store}
                    data-testid="options-upgrade-failed-store"
                    data-store={failure.store}
                    sx={{ alignItems: 'center', listStyle: 'none' }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ flex: 1, textAlign: 'left' }}
                    >
                      <strong>{localizedStoreName(failure.store)}</strong>
                      {': '}
                      {describeOptionsProblem(failure.problem)}
                    </Typography>
                    <Button
                      size="small"
                      color="warning"
                      disabled={reset.isPending}
                      onClick={() => confirmReset(failure.store)}
                    >
                      {t('optionsUpgrade.reset.button', 'Reset')}
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
            {reset.isError && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {t(
                  'optionsUpgrade.reset.failed',
                  'The reset did not finish. Try again.'
                )}
              </Typography>
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
