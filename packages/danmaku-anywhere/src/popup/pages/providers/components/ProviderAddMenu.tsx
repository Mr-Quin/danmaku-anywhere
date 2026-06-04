import { Add, AddCircle } from '@mui/icons-material'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'

interface ProviderAddMenuProps {
  onAddDanDanPlayProvider: () => void
  onAddMacCmsProvider: () => void
}

export const ProviderAddMenu = ({
  onAddDanDanPlayProvider,
  onAddMacCmsProvider,
}: ProviderAddMenuProps) => {
  return (
    <DrilldownMenu
      icon={<AddCircle />}
      ButtonProps={{ color: 'primary', size: 'small' }}
      dense
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
  )
}
