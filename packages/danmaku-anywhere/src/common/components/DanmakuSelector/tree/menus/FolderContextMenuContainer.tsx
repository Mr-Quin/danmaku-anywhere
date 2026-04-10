import { AutoFixHigh, Edit } from '@mui/icons-material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useNamingRuleDialog } from '@/common/components/DanmakuSelector/useNamingRuleDialog'
import type { DAMenuItemConfig } from '@/common/components/Menu/DAMenuItemConfig'
import { DrilldownContextMenu } from '@/common/components/Menu/DrilldownContextMenu'
import { DrilldownMenu } from '@/common/components/Menu/DrilldownMenu'
import { useDanmakuTreeContext } from '../DanmakuTreeContext'

interface FolderContextMenuContainerProps {
  folderPath: string
  itemId: string
}

export const FolderContextMenuContainer = ({
  folderPath,
  itemId,
}: FolderContextMenuContainerProps): ReactElement | null => {
  const { t } = useTranslation()
  const { contextMenu, setContextMenu, namingRuleByFolderPath } =
    useDanmakuTreeContext()
  const openDialog = useNamingRuleDialog()
  const existingRule = namingRuleByFolderPath.get(folderPath)

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
