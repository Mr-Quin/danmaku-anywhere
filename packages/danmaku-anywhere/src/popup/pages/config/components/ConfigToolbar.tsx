import {
  AddCircle,
  Download,
  Edit,
  Upload,
  Visibility,
} from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { combinedPolicyService } from '@/common/options/combinedPolicy'
import { downloadZip, sanitizeFilename } from '@/common/utils/utils'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { TabToolbar } from '@/content/common/TabToolbar'

type ConfigToolbarProps = {
  onAdd: () => void
  onShowIntegration: () => void
}

export const ConfigToolbar = ({
  onAdd,
  onShowIntegration,
}: ConfigToolbarProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const exportAll = useMutation({
    mutationFn: async () => {
      const configs = await combinedPolicyService.exportAll()
      await downloadZip(
        'configs',
        configs.map((config) => {
          return {
            name: `${sanitizeFilename(config.name)}.json`,
            data: JSON.stringify(config, null, 2),
          }
        })
      )
    },
  })

  const handleImportConfigs = async () => {
    navigate('import')
  }

  return (
    <TabToolbar title={t('configPage.name')}>
      <DrilldownMenu
        icon={<AddCircle />}
        ButtonProps={{ color: 'primary' }}
        items={[
          {
            id: 'add',
            label: t('configPage.createConfig'),
            onClick: onAdd,
            icon: <Edit />,
          },
          {
            id: 'import',
            label: t('configPage.import.name'),
            icon: <Upload />,
            onClick: handleImportConfigs,
          },
        ]}
      />
      <DrilldownMenu
        ButtonProps={{ edge: 'end' }}
        items={[
          {
            id: 'export',
            label: t('configPage.exportAll'),
            onClick: () => exportAll.mutate(),
            loading: exportAll.isPending,
            icon: <Download />,
          },
          {
            id: 'showIntegration',
            label: t('configPage.showIntegration'),
            onClick: onShowIntegration,
            icon: <Visibility />,
          },
        ]}
      />
    </TabToolbar>
  )
}
