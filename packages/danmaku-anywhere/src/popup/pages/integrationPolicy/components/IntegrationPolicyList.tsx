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
import { useDialog } from '@/common/components/Dialog/dialogStore'
import { DrilldownMenu } from '@/common/components/DrilldownMenu'
import { NothingHere } from '@/common/components/NothingHere'
import { useToast } from '@/common/components/Toast/toastStore'
import type { Integration } from '@/common/options/integrationPolicyStore/schema'
import { useIntegrationPolicyStore } from '@/common/options/integrationPolicyStore/useIntegrationPolicyStore'

export const IntegrationPolicyList = ({
  onEdit,
}: {
  onEdit: (config: Integration) => void
}) => {
  const { t } = useTranslation()
  const { policies, remove } = useIntegrationPolicyStore()
  const dialog = useDialog()
  const toast = useToast.use.toast()

  const handleDelete = (policy: Integration) => {
    dialog.delete({
      title: t('common.confirmDeleteTitle'),
      content: t('common.confirmDeleteMessage', { name: policy.name }),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await remove(policy.id)
        toast.success(t('configs.alert.deleted'))
      },
    })
  }

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
                  <MenuItem onClick={() => handleDelete(policy)}>
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
