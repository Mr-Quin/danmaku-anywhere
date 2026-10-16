import { Box } from '@mui/material'
import { type PropsWithChildren, Suspense } from 'react'
import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { OptionsReadinessGate } from '@/common/options/ReadinessService/OptionsReadinessGate'
import { SystemTheme } from '@/common/theme/Theme'
import { PopupLayout } from '@/popup/layout/PopupLayout'
import { OptionsUpgradeFailed } from './OptionsUpgradeFailed'

function PopupStatusScreen({ children }: PropsWithChildren) {
  return (
    <SystemTheme>
      <Suspense fallback={null}>
        <PopupLayout>{children}</PopupLayout>
      </Suspense>
    </SystemTheme>
  )
}

export function PopupReadinessGate({ children }: PropsWithChildren) {
  return (
    <OptionsReadinessGate
      pending={
        <PopupStatusScreen>
          <Box data-testid="options-upgrade-pending" sx={{ height: 1 }}>
            <FullPageSpinner />
          </Box>
        </PopupStatusScreen>
      }
      failed={
        <PopupStatusScreen>
          <OptionsUpgradeFailed />
        </PopupStatusScreen>
      }
    >
      {children}
    </OptionsReadinessGate>
  )
}
