import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createAuthClientInstance } from '@/common/auth/createAuthClient'
import type { AuthActionResult } from '@/common/auth/types'
import { UserAuthService } from '@/common/options/userAuth/service'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

type AuthMode = 'signIn' | 'signUp'

const resolveAuthError = (result: AuthActionResult | undefined) => {
  if (!result) return null
  if (result.state === 'error') return result.message
  return null
}

export const AuthPage = () => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<AuthMode>('signIn')
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [actionError, setActionError] = useState<string | null>(null)
  const [googlePending, setGooglePending] = useState(false)

  const userAuthService = useMemo(() => new UserAuthService(), [])
  const authClient = useMemo(
    () => createAuthClientInstance(userAuthService),
    [userAuthService]
  )

  const sessionQuery = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const res = await chromeRpcClient.authGetSession()
      return res.data
    },
  })

  const signInMutation = useMutation({
    mutationFn: async () => {
      const res = await chromeRpcClient.authSignInEmail({
        email: formState.email,
        password: formState.password,
      })
      return res.data
    },
    onSuccess: (result) => {
      const message = resolveAuthError(result)
      if (message) {
        setActionError(message)
        return
      }
      setActionError(null)
      void sessionQuery.refetch()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  })

  const signUpMutation = useMutation({
    mutationFn: async () => {
      const res = await chromeRpcClient.authSignUpEmail({
        email: formState.email,
        password: formState.password,
        name: formState.name.trim() || undefined,
      })
      return res.data
    },
    onSuccess: (result) => {
      const message = resolveAuthError(result)
      if (message) {
        setActionError(message)
        return
      }
      setActionError(null)
      void sessionQuery.refetch()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  })

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const res = await chromeRpcClient.authSignOut()
      return res.data
    },
    onSuccess: (result) => {
      if (result.state === 'error') {
        setActionError(result.message)
        return
      }
      setActionError(null)
      void sessionQuery.refetch()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'signIn') {
      signInMutation.mutate()
    } else {
      signUpMutation.mutate()
    }
  }

  const handleGoogleSignIn = async () => {
    setActionError(null)
    setGooglePending(true)
    try {
      await authClient.signIn.social({ provider: 'google' })
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Google sign-in failed'
      )
    } finally {
      setGooglePending(false)
    }
  }

  const isPending =
    signInMutation.isPending || signUpMutation.isPending || googlePending

  const session = sessionQuery.data?.session
  const token = sessionQuery.data?.token

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.auth', 'Account')} />
      <Box sx={{ p: 2 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('optionsPage.auth.status', 'Status')}
          </Typography>
          {sessionQuery.isLoading ? (
            <CircularProgress size={24} />
          ) : session ? (
            <Stack spacing={1}>
              <Typography variant="body2">
                {t('optionsPage.auth.loggedInAs', 'Logged in as')}:{' '}
                {session.user.email || session.user.name || session.user.id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('optionsPage.auth.token', 'Token')}: {token ? '•••••' : '—'}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => signOutMutation.mutate()}
                disabled={signOutMutation.isPending}
              >
                {signOutMutation.isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  t('optionsPage.auth.signOut', 'Sign out')
                )}
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('optionsPage.auth.notSignedIn', 'Not signed in')}
            </Typography>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Tabs
            value={mode}
            onChange={(_, value) => setMode(value)}
            sx={{ mb: 2 }}
          >
            <Tab
              label={t('optionsPage.auth.signIn', 'Sign in')}
              value="signIn"
            />
            <Tab
              label={t('optionsPage.auth.signUp', 'Sign up')}
              value="signUp"
            />
          </Tabs>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {mode === 'signUp' && (
                <TextField
                  label={t('optionsPage.auth.name', 'Name')}
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  autoComplete="name"
                />
              )}
              <TextField
                label={t('optionsPage.auth.email', 'Email')}
                value={formState.email}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                type="email"
                autoComplete="email"
                required
              />
              <TextField
                label={t('optionsPage.auth.password', 'Password')}
                value={formState.password}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                type="password"
                autoComplete={
                  mode === 'signUp' ? 'new-password' : 'current-password'
                }
                required
              />
              <Button type="submit" variant="contained" disabled={isPending}>
                {isPending ? (
                  <CircularProgress size={20} />
                ) : mode === 'signUp' ? (
                  t('optionsPage.auth.signUp', 'Sign up')
                ) : (
                  t('optionsPage.auth.signIn', 'Sign in')
                )}
              </Button>
              <Button
                variant="outlined"
                onClick={handleGoogleSignIn}
                disabled={isPending}
              >
                {googlePending ? (
                  <CircularProgress size={20} />
                ) : (
                  t('optionsPage.auth.signInWithGoogle', 'Continue with Google')
                )}
              </Button>
              {actionError && <Alert severity="error">{actionError}</Alert>}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </OptionsPageLayout>
  )
}
