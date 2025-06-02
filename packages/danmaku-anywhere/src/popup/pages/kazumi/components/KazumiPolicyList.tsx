import { Delete } from '@mui/icons-material'
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { NothingHere } from '@/common/components/NothingHere'
import { kazumiPolicyService } from '@/common/options/kazumiPolicy/service'
import { useKazumiPolicies } from '@/common/options/kazumiPolicy/useKazumiManifest'
import { kazumiQueryKeys } from '@/common/queries/queryKeys'
import { DrilldownMenu } from '@/content/common/DrilldownMenu'
import { useMutation } from '@tanstack/react-query'

export const KazumiPolicyList = () => {
  const { t } = useTranslation()
  const { data: policies } = useKazumiPolicies()

  const deleteMutation = useMutation({
    mutationKey: kazumiQueryKeys.policies(),
    mutationFn: (name: string) => kazumiPolicyService.delete(name),
  })

  if (policies.length === 0) return <NothingHere />

  return (
    <List dense disablePadding>
      {policies.map((config) => {
        return (
          <ListItem
            key={config.name}
            secondaryAction={
              <>
                <DrilldownMenu
                  BoxProps={{ display: 'inline' }}
                  ButtonProps={{ edge: 'end' }}
                >
                  <MenuItem onClick={() => deleteMutation.mutate(config.name)}>
                    <ListItemIcon>
                      <Delete />
                    </ListItemIcon>
                    <ListItemText>{t('common.delete')}</ListItemText>
                  </MenuItem>
                </DrilldownMenu>
              </>
            }
          >
            <ListItemText primary={config.name} secondary={config.version} />
          </ListItem>
        )
      })}
    </List>
  )
}
