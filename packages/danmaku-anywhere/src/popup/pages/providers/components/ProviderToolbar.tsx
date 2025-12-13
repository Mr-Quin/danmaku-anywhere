import { Add, AddCircle } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'

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
    <TabToolbar title={t('providers.name', 'Danmaku Providers')}>
      <DrilldownMenu
        icon={<AddCircle />}
        ButtonProps={{ color: 'primary' }}
        items={[
          {
            id: 'add-dandanplay',
            label: localizedDanmakuSourceType(DanmakuSourceType.DanDanPlay),
            onClick: onAddDanDanPlayProvider,
            icon: <Add />,
          },
          {
            id: 'add-maccms',
            label: localizedDanmakuSourceType(DanmakuSourceType.MacCMS),
            onClick: onAddMacCmsProvider,
            icon: <Add />,
          },
        ]}
      />
    </TabToolbar>
  )
}
