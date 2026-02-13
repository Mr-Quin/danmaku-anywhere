import { Box, CircularProgress, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthSession } from '@/common/hooks/user/useAuthSession'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { SignInForm } from './components/SignInForm'
import { SignUpForm } from './components/SignUpForm'
import { UserProfile } from './components/UserProfile'

export const AuthPage = () => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const { data: sessionData, isLoading } = useAuthSession()

  const user = sessionData?.user

  function renderContent() {
    if (isLoading) {
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      )
    }

    if (user) {
      return <UserProfile user={user} />
    }

    return (
      <>
        <Tabs
          value={mode}
          onChange={(_, v) => setMode(v)}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab label={t('optionsPage.auth.signIn', 'Sign In')} value="signIn" />
          <Tab label={t('optionsPage.auth.signUp', 'Sign Up')} value="signUp" />
        </Tabs>

        <Box px={2}>{mode === 'signIn' ? <SignInForm /> : <SignUpForm />}</Box>
      </>
    )
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.auth', 'Account')} />
      {renderContent()}
    </OptionsPageLayout>
  )
}
