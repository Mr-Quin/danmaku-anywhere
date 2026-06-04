import { Check, ChevronRight, Person } from '@mui/icons-material'
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Skeleton,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useAuthSession } from '@/common/hooks/user/useAuthSession'
import { Monogram } from './Monogram'

export const AccountCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: session, isLoading } = useAuthSession()

  const goToAuth = () => navigate('auth')

  if (isLoading) {
    return (
      <Box sx={{ mx: 1.5, mt: 1.5, mb: 0.5 }}>
        <Skeleton variant="rounded" height={66} />
      </Box>
    )
  }

  if (!session) {
    return (
      <Box
        sx={{
          mx: 1.5,
          mt: 1.5,
          mb: 0.5,
          p: 1.75,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.light}, ${alpha(theme.palette.secondary.light, 0.6)})`,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            color: 'primary.main',
          }}
        >
          <Person />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('optionsPage.account.signInToSync', 'Sign in to sync')}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.secondary' }}
          >
            {t(
              'optionsPage.account.signInDescription',
              'Back up configs and danmaku to the cloud'
            )}
          </Typography>
        </Box>
        <Button variant="contained" onClick={goToAuth}>
          {t('optionsPage.auth.signIn', 'Sign In')}
        </Button>
      </Box>
    )
  }

  return (
    <ButtonBase
      onClick={goToAuth}
      sx={{
        mx: 1.5,
        mt: 1.5,
        mb: 0.5,
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        textAlign: 'left',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Monogram name={session.user.name} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {session.user.name}
          </Typography>
          <Chip
            label={t('optionsPage.account.synced', 'Synced')}
            size="small"
            color="success"
            icon={<Check />}
          />
        </Box>
        <Typography
          variant="caption"
          noWrap
          sx={{ display: 'block', color: 'text.secondary' }}
        >
          {session.user.email}
        </Typography>
      </Box>
      <ChevronRight
        fontSize="small"
        sx={{ color: 'text.secondary', opacity: 0.7 }}
      />
    </ButtonBase>
  )
}
