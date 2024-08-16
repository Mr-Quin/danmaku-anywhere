import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const Permissions = () => {
  const { t } = useTranslation()

  const { data } = useSuspenseQuery({
    queryKey: [
      {
        scope: 'chrome',
        kind: 'permissions',
      },
    ],
    queryFn: async () => {
      return await chrome.permissions.getAll()
    },
  })

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.permissions')} />
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
