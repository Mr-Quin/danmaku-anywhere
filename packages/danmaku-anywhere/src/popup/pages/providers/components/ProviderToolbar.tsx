import { Add, AddCircle } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabToolbar } from '@/content/common/TabToolbar'

interface ProviderToolbarProps {
  onAddDanDanPlayProvider: () => void
  onAddMacCmsProvider: () => void
}

export const ProviderToolbar = ({
  onAddDanDanPlayProvider,
  onAddMacCmsProvider,
}: ProviderToolbarProps) => {
  const { t } = useTranslation()

  return (
    <TabToolbar title={t('providers.name')}>
      <DrilldownMenu
        icon={<AddCircle />}
        ButtonProps={{ color: 'primary' }}
        items={[
          {
            id: 'add-dandanplay',
            label: t('providers.type.custom-dandanplay'),
            onClick: onAddDanDanPlayProvider,
            icon: <Add />,
          },
          {
            id: 'add-maccms',
            label: t('providers.type.custom-maccms'),
            onClick: onAddMacCmsProvider,
            icon: <Add />,
          },
        ]}
      />
    </TabToolbar>
  )
}
