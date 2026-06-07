import { ChevronRight, Person } from '@mui/icons-material'
import { Box, Button, ButtonBase, Skeleton, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { HashAvatar } from '@/common/components/HashAvatar'
import { useAuthSession } from '@/common/hooks/user/useAuthSession'

export const AccountCard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: session, isLoading } = useAuthSession()

  const goToAuth = () => navigate('auth')

  if (isLoading) {
    return (
      <Box sx={{ mx: 1.5, mt: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Skeleton
            variant="rounded"
            width={42}
            height={42}
            sx={{ borderRadius: 1, flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton
              variant="text"
              width="40%"
              sx={{ fontSize: '0.875rem' }}
            />
            <Skeleton variant="text" width="65%" sx={{ fontSize: '0.75rem' }} />
          </Box>
        </Box>
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
          bgcolor: 'background.paper',
          backgroundImage: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.04)})`,
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
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
        <Button variant="soft" onClick={goToAuth}>
          {t('optionsPage.auth.signIn', 'Sign In')}
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ mx: 1.5, mt: 1.5, mb: 0.5 }}>
      <ButtonBase
        onClick={goToAuth}
        sx={{
          width: '100%',
          boxSizing: 'border-box',
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
        <HashAvatar
          seed={session.user.id}
          label={session.user.name}
          size={42}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {session.user.name}
          </Typography>
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
    </Box>
  )
}
