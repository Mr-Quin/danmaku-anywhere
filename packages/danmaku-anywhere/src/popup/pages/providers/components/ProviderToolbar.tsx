import { Add } from '@mui/icons-material'
import { Button } from '@mui/material'
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
        dense
        renderButton={({ onClick }) => (
          <Button
            variant="soft"
            color="primary"
            size="small"
            startIcon={<Add />}
            onClick={onClick}
          >
            {t('common.add', 'Add')}
          </Button>
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
