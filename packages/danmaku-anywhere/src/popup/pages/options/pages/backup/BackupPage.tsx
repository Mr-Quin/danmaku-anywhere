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
      <Box sx={{ px: 2, pb: 4 }}>
        <Stack spacing={4}>
          <Box>
            <LocalBackupSection isRestoringExt={isRestoringCloud} />
          </Box>
          <Divider />
          <Box>
            <CloudBackupSection
              onRestoringChange={(val) => setIsRestoringCloud(val)}
            />
          </Box>
        </Stack>
      </Box>
    </OptionsPageLayout>
  )
}
