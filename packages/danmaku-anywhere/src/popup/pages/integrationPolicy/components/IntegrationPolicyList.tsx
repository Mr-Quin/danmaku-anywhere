import { Delete } from '@mui/icons-material'
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DrilldownMenu } from '@/common/components/DrilldownMenu'
import { NothingHere } from '@/common/components/NothingHere'
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'

export const IntegrationPolicyList = ({
  onEdit,
  onDelete,
}: {
  onEdit: (config: Integration) => void
  onDelete: (config: Integration) => void
}) => {
  const { t } = useTranslation()
  const { policies } = useIntegrationPolicyStore()

  if (policies.length === 0) return <NothingHere />

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
