import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'

import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const Permissions = () => {
  const { data } = useSuspenseQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      return await chrome.permissions.getAll()
    },
  })

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title="Permissions" />
      <Box p={2}>
        <Typography>
          Permissions can be managed in the browser settings. This page only
          shows the permissions that are set by the extension.
        </Typography>
      </Box>
      <Divider />
      <List disablePadding>
        {data.origins?.map((origin) => {
          return (
            <ListItem key={origin}>
              <ListItemText>{origin}</ListItemText>
            </ListItem>
          )
        })}
      </List>
    </OptionsPageLayout>
  )
}
