import { Mail, Person } from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { AuthUserInfo } from '@/common/auth/types'
import { HashAvatar } from '@/common/components/HashAvatar'
import { useSignOutMutation } from '@/common/hooks/user/useAuthMutations'
import {
  SettingsGroup,
  SettingsStaticRow,
} from '@/popup/pages/options/components/settings/SettingsGroup'

export const UserProfile = ({ user }: { user: AuthUserInfo }) => {
  const { t } = useTranslation()
  const signOutMutation = useSignOutMutation()

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          pt: 3,
          pb: 2,
        }}
      >
        <HashAvatar seed={user.id} label={user.name} size={64} />
        <Typography variant="h4" sx={{ mt: 1 }}>
          {user.name}
        </Typography>
      </Box>

      <SettingsGroup>
        <SettingsStaticRow
          icon={<Person fontSize="small" />}
          title={t('optionsPage.auth.name', 'Name')}
          right={
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {user.name}
            </Typography>
          }
        />
        <SettingsStaticRow
          icon={<Mail fontSize="small" />}
          iconTone="secondary"
          title={t('optionsPage.auth.email', 'Email')}
          right={
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {user.email}
            </Typography>
          }
        />
      </SettingsGroup>

      <Box sx={{ px: 1.5, pt: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          onClick={() => signOutMutation.mutate()}
          disabled={signOutMutation.isPending}
        >
          {t('optionsPage.auth.signOut', 'Sign Out')}
        </Button>
      </Box>
    </Box>
  )
}
