import { Add } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { ListAddButton } from '@/common/components/ListAddButton'
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
        dense
        renderButton={({ onClick }) => (
          <ListAddButton onClick={onClick}>
            {t('common.add', 'Add')}
          </ListAddButton>
        )}
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
