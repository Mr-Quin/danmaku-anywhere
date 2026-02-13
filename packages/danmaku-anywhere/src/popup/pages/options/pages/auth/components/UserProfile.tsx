import { Box, Button, List, ListItem, ListItemText, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { AuthUserInfo } from '@/common/auth/types'
import { useSignOutMutation } from '@/common/hooks/user/useAuthMutations'

export const UserProfile = ({ user }: { user: AuthUserInfo }) => {
  const { t } = useTranslation()
  const signOutMutation = useSignOutMutation()

  return (
    <Box>
      <List>
        <ListItem>
          <ListItemText
            primary={`${t('optionsPage.auth.name', 'Name')}: ${user.name}`}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={`${t('optionsPage.auth.email', 'Email')}: ${user.email}`}
          />
        </ListItem>
      </List>

      <Stack direction="row" spacing={2} sx={{ px: 2 }}>
        <Button
          variant="contained"
          onClick={() => signOutMutation.mutate()}
          disabled={signOutMutation.isPending}
        >
          {t('optionsPage.auth.signOut', 'Sign Out')}
        </Button>
      </Stack>
    </Box>
  )
}
