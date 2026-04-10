import { AutoFixHigh, Edit } from '@mui/icons-material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownContextMenu } from '@/common/components/Menu/DrilldownContextMenu'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { useNamingRules } from '@/common/options/localMatchingRule/useLocalMatchingRule'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'
import { useCreateMatchingRuleDialog } from './useCreateMatchingRuleDialog'

interface FolderContextMenuContainerProps {
  folderPath: string
  itemId: string
}

export const FolderContextMenuContainer = ({
  folderPath,
  itemId,
}: FolderContextMenuContainerProps): ReactElement | null => {
  const { t } = useTranslation()
  const { contextMenu, setContextMenu } = useDanmakuTreeContext()
  const openDialog = useCreateMatchingRuleDialog()
  const { rules } = useNamingRules()
  const existingRule = rules.find((r) => r.folderPath === folderPath)

  const handleOpenDialog = () => {
    setContextMenu(null)
    openDialog(folderPath, existingRule)
  }

  const items: DAMenuItemConfig[] = [
    {
      kind: 'item',
      id: 'namingRule',
      label: existingRule
        ? t('namingRule.edit', 'Edit Naming Rule')
        : t('namingRule.create', 'Create Naming Rule'),
      icon: existingRule ? (
        <Edit fontSize="small" />
      ) : (
        <AutoFixHigh fontSize="small" />
      ),
      onClick: handleOpenDialog,
    },
  ]

  const isContextOpen = contextMenu?.itemId === itemId
  const contextPosition = isContextOpen ? contextMenu.position : undefined
  const handleClose = () => setContextMenu(null)

  if (contextPosition) {
    return (
      <DrilldownContextMenu
        items={items}
        anchorPosition={contextPosition}
        open
        dense
        onClose={handleClose}
      />
    )
  }

  return <DrilldownMenu items={items} ButtonProps={{ size: 'small' }} dense />
}
