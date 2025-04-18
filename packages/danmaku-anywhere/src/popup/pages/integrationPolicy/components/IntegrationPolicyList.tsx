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

import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'
import { tryCatch } from '@/common/utils/utils'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'

export const IntegrationPolicyList = ({
  onEdit,
  onDelete,
}: {
  onEdit: (config: Integration) => void
  onDelete: (config: Integration) => void
}) => {
  const { t } = useTranslation()
  const { policies } = useIntegrationPolicyStore()

  const copyToClipboard = async (policy: Integration) => {
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
                secondary={
                  policy.policy.options.titleOnly
                    ? t('integrationPolicyPage.editor.titleOnly')
                    : ''
                }
              />
            </ListItemButton>
          </ListItem>
        )
      })}
    </List>
  )
}
