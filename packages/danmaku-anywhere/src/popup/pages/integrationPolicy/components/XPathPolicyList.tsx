import { ContentCopy, Delete } from '@mui/icons-material'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import type { XPathPolicyItem } from '@/common/options/xpathPolicyStore/schema'
import { useXPathPolicyStore } from '@/common/options/xpathPolicyStore/useXPathPolicyStore'
import { tryCatch } from '@/common/utils/utils'
import { DrilldownMenu } from '@/popup/component/DrilldownMenu'

export const XPathPolicyList = ({
  onEdit,
  onDelete,
}: {
  onEdit: (config: XPathPolicyItem) => void
  onDelete: (config: XPathPolicyItem) => void
}) => {
  const { t } = useTranslation()
  const { policies } = useXPathPolicyStore()

  const copyToClipboard = async (policy: XPathPolicyItem) => {
    await tryCatch(() =>
      navigator.clipboard.writeText(JSON.stringify(policy, null, 2))
    )
  }

  return (
    <List dense disablePadding>
      {policies.map((policy) => {
        return (
          <ListItem
            key={policy.id}
            secondaryAction={
              <>
                <DrilldownMenu
                  BoxProps={{ display: 'inline' }}
                  ButtonProps={{ edge: 'end' }}
                >
                  <MenuItem onClick={() => onDelete(policy)}>
                    <ListItemIcon>
                      <Delete />
                    </ListItemIcon>
                    <ListItemText>{t('common.delete')}</ListItemText>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      void copyToClipboard(policy)
                    }}
                  >
                    <ListItemIcon>
                      <ContentCopy />
                    </ListItemIcon>
                    <ListItemText>{t('common.copyToClipboard')}</ListItemText>
                  </MenuItem>
                </DrilldownMenu>
              </>
            }
            disablePadding
          >
            <ListItemButton onClick={() => onEdit(policy)}>
              <ListItemText
                primary={policy.name}
                secondary={policy.policy.title.selector}
              />
            </ListItemButton>
          </ListItem>
        )
      })}
    </List>
  )
}
