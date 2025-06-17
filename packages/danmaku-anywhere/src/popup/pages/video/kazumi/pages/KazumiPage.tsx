import { ModalDialog } from '@/common/components/ModalDialog'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { PolicyRepo } from '@/popup/pages/video/kazumi/pages/import/PolicyRepo'
import { AddCircle, GitHub } from '@mui/icons-material'
import {} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { KazumiPolicyList } from '../components/KazumiPolicyList'

export const KazumiPage = () => {
  const { t } = useTranslation()
  const { state } = useLocation()
  const [showImportDialog, setShowImportDialog] = useState(state === 'import')

  const handleImportConfigs = async () => {
    setShowImportDialog(true)
  }

  return (
    <TabLayout>
      <TabToolbar title={t('kazumiPage.name')}>
        <DrilldownMenu
          icon={<AddCircle />}
          ButtonProps={{ color: 'primary', edge: 'end' }}
          items={[
            {
              id: 'import',
              label: t('kazumiPage.import.fromRepo'),
              icon: <GitHub />,
              onClick: handleImportConfigs,
            },
          ]}
        />
      </TabToolbar>
      <KazumiPolicyList onOpenImport={handleImportConfigs} />
      <ModalDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        dialogTitle={t('kazumiPage.import.fromRepo')}
      >
        <PolicyRepo />
      </ModalDialog>
    </TabLayout>
  )
}
