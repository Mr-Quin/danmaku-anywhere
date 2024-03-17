import { Delete } from '@mui/icons-material'
import { IconButton, List, ListItem, ListItemText } from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'

import { OptionsLayout } from '../components/OptionsLayout'

import { removeOriginPermission } from '@/common/utils'

const defaultHostPermissions = ['https://*.dandanplay.net/*']

export const Permissions = () => {
  const { data, refetch } = useSuspenseQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      return await chrome.permissions.getAll()
    },
  })

  return (
    <OptionsLayout subpage title="Permissions">
      <List disablePadding>
        {data.origins
          // prevent modifying default permissions
          ?.filter((origin) => !defaultHostPermissions.includes(origin))
          .map((origin) => {
            return (
              <ListItem
                key={origin}
                secondaryAction={
                  <IconButton
                    onClick={async () => {
                      await removeOriginPermission([origin])
                      await refetch()
                    }}
                  >
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemText>{origin}</ListItemText>
              </ListItem>
            )
          })}
      </List>
    </OptionsLayout>
  )
}
