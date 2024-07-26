import { Box } from '@mui/material'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { MountController } from './components/MountController'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'
import { TabToolbar } from '@/popup/component/TabToolbar'
import { TabLayout } from '@/popup/layout/TabLayout'
import { HasDanmaku } from '@/popup/pages/mount/components/HasDanmaku'
import { IsConnected } from '@/popup/pages/mount/components/IsConnected'

export const MountPage = () => {
  const { t } = useTranslation()

  return (
    <TabLayout>
      <Suspense fallback={<FullPageSpinner />}>
        <TabToolbar title={t('mountPage.pageTitle')} />
        <IsConnected>
          <HasDanmaku>
            <Box p={2}>
              <MountController />
            </Box>
          </HasDanmaku>
        </IsConnected>
      </Suspense>
    </TabLayout>
  )
}
