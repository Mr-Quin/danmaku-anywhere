import { Add, Code } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { ListAddButton } from '@/common/components/ListAddButton'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'

interface ProviderAddMenuProps {
  onAddDanDanPlayProvider: () => void
  onAddMacCmsProvider: () => void
  onAuthorManifest: () => void
}

export const ProviderAddMenu = ({
  onAddDanDanPlayProvider,
  onAddMacCmsProvider,
  onAuthorManifest,
}: ProviderAddMenuProps) => {
  const { t } = useTranslation()

  return (
    <DrilldownMenu
      dense
      renderButton={(props) => (
        <ListAddButton {...props}>{t('common.add', 'Add')}</ListAddButton>
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
        {
          id: 'author-manifest',
          label: t('providers.editor.manifest.author', 'Author a manifest'),
          onClick: onAuthorManifest,
          icon: <Code />,
        },
      ]}
    />
  )
}
