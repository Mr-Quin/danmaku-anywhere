import { Outlet, useNavigate } from 'react-router'

import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { AddCircle, Upload } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { KazumiPolicyList } from '../components/KazumiPolicyList'

export const KazumiPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleImportConfigs = async () => {
    navigate('import')
  }

  return (
    <>
      <TabLayout>
        <TabToolbar title={t('kazumiPage.name')}>
          <DrilldownMenu
            icon={<AddCircle />}
            ButtonProps={{ color: 'primary', edge: 'end' }}
            items={[
              {
                id: 'import',
                label: t('kazumiPage.import.name'),
                icon: <Upload />,
                onClick: handleImportConfigs,
              },
            ]}
          />
        </TabToolbar>
        <KazumiPolicyList />
      </TabLayout>
      <Outlet />
    </>
  )
}
