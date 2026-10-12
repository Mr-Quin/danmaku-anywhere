import { Add, Code } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { ListAddButton } from '@/common/components/ListAddButton'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'

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
          label: t('providers.add.dandanplay', 'DanDanPlay-compatible server'),
          secondary: t(
            'providers.add.dandanplayHint',
            'A self-hosted or third-party server'
          ),
          onClick: onAddDanDanPlayProvider,
          icon: <Add />,
        },
        {
          id: 'add-maccms',
          label: t('providers.add.vod', 'VOD'),
          secondary: t(
            'providers.add.vodHint',
            'Danmaku API of a MacCMS video site'
          ),
          onClick: onAddMacCmsProvider,
          icon: <Add />,
        },
        { kind: 'separator', id: 'advanced-separator' },
        {
          id: 'author-manifest',
          label: t('providers.add.manifest', 'Custom source from manifest'),
          secondary: t(
            'providers.add.manifestHint',
            'Advanced: write the source as JSON'
          ),
          onClick: onAuthorManifest,
          icon: <Code />,
          color: 'text.secondary',
        },
      ]}
    />
  )
}
