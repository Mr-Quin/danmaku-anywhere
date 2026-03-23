import { Box, Divider, Stack } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { CloudBackupSection } from './components/CloudBackupSection'
import { LocalBackupSection } from './components/LocalBackupSection'

export function BackupPage() {
  const { t } = useTranslation()
  const [isRestoringCloud, setIsRestoringCloud] = useState(false)

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar
        title={t('optionsPage.pages.backup', 'Backup & Restore')}
      />
      <Box p={2}>
        <Stack spacing={2}>
          <LocalBackupSection isRestoringExt={isRestoringCloud} />
          <Divider />
          <CloudBackupSection
            onRestoringChange={(val) => setIsRestoringCloud(val)}
          />
        </Stack>
      </Box>
    </OptionsPageLayout>
  )
}
