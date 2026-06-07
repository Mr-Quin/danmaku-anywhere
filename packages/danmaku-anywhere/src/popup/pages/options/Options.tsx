import {
  BugReport,
  CloudOutlined,
  DeleteOutlined,
  FavoriteBorder,
  GitHub,
  InfoOutlined,
  Keyboard,
  PlayArrow,
  Tune,
} from '@mui/icons-material'
import { Box, IconButton, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate, useSearchParams } from 'react-router'
import {
  BUG_FORM,
  EXTENSION_REPO,
  EXTENSION_VERSION,
  FEEDBACK_FORM,
} from '@/common/constants'
import { useAuthSession } from '@/common/hooks/user/useAuthSession'
import { ALL_HOTKEYS } from '@/common/options/extensionOptions/hotkeys'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { AccountCard } from './components/settings/AccountCard'
import { LanguageRow } from './components/settings/LanguageRow'
import {
  SettingsGroup,
  SettingsGroupLabel,
  SettingsRow,
} from './components/settings/SettingsGroup'

const Footer = () => {
  return (
    <Box
      sx={{
        mt: 'auto',
        px: 2,
        py: 1,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
        Danmaku Anywhere{' '}
        <Box component="b" sx={{ color: 'text.primary' }}>
          v{EXTENSION_VERSION}
        </Box>
      </Typography>
      <IconButton
        size="small"
        sx={{ color: 'text.secondary' }}
        onClick={() => window.open(EXTENSION_REPO, '_blank')}
      >
        <GitHub fontSize="small" />
      </IconButton>
    </Box>
  )
}

export const Options = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data } = useExtensionOptions()
  const { data: session } = useAuthSession()

  const boundHotkeyCount = ALL_HOTKEYS.filter(
    (id) => data.hotkeys[id]?.key
  ).length

  const retention = data.retentionPolicy
  const dataSubtitle = retention.enabled
    ? t('optionsPage.menu.retentionDays', 'Retention: {{count}} days', {
        count: retention.deleteCommentsAfter,
      })
    : t('optionsPage.menu.retentionOff', 'Retention off')

  return (
    <>
      <OptionsPageLayout direction="up">
        <Box
          sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
        >
          <OptionsPageToolBar
            leftElement={
              searchParams.get('from') === 'content' ? false : undefined
            }
            title={t('optionsPage.name', 'Settings')}
          />

          <Box sx={{ flex: 1, pb: 1 }}>
            <AccountCard />

            <SettingsGroupLabel>
              {t('optionsPage.menu.playback', 'Playback')}
            </SettingsGroupLabel>
            <SettingsGroup>
              <SettingsRow
                icon={<PlayArrow fontSize="small" />}
                title={t('optionsPage.pages.player', 'Player Settings')}
                onClick={() => navigate('player')}
              />
              <SettingsRow
                icon={<Keyboard fontSize="small" />}
                iconTone="secondary"
                title={t('optionsPage.pages.hotkeys', 'Hotkeys')}
                subtitle={t(
                  'optionsPage.menu.shortcutsBound',
                  '{{count}} shortcuts bound',
                  { count: boundHotkeyCount }
                )}
                onClick={() => navigate('hotkeys')}
              />
            </SettingsGroup>

            <SettingsGroupLabel>
              {t('optionsPage.menu.data', 'Data')}
            </SettingsGroupLabel>
            <SettingsGroup>
              <SettingsRow
                icon={<DeleteOutlined fontSize="small" />}
                iconTone="warning"
                title={t('optionsPage.pages.dataManagement', 'Data Management')}
                subtitle={dataSubtitle}
                onClick={() => navigate('data-management')}
              />
              <SettingsRow
                icon={<CloudOutlined fontSize="small" />}
                iconTone="info"
                title={t('optionsPage.pages.backup', 'Backup & Restore')}
                subtitle={
                  session
                    ? t('optionsPage.menu.cloudReady', 'Cloud sync ready')
                    : t('optionsPage.menu.localOnly', 'Local backup')
                }
                onClick={() => navigate('backup')}
              />
            </SettingsGroup>

            <SettingsGroupLabel>
              {t('optionsPage.menu.general', 'General')}
            </SettingsGroupLabel>
            <SettingsGroup>
              <LanguageRow />
              <SettingsRow
                icon={<Tune fontSize="small" />}
                iconTone="secondary"
                title={t('optionsPage.pages.advanced', 'Advanced')}
                subtitle={t(
                  'optionsPage.menu.advancedSubtitle',
                  'Diagnostics, experimental flags'
                )}
                onClick={() => navigate('advanced')}
              />
            </SettingsGroup>

            <SettingsGroupLabel>
              {t('optionsPage.menu.aboutSupport', 'About & Support')}
            </SettingsGroupLabel>
            <SettingsGroup>
              <SettingsRow
                icon={<InfoOutlined fontSize="small" />}
                title={t('optionsPage.pages.help', 'About')}
                subtitle={t(
                  'optionsPage.menu.aboutSubtitle',
                  'Help, credits, licenses'
                )}
                onClick={() => navigate('help')}
              />
              <SettingsRow
                icon={<BugReport fontSize="small" />}
                iconTone="error"
                title={t('optionsPage.help.reportBug', 'Report a Bug')}
                external
                href={`${BUG_FORM}?ID=${data.id}&Version=${EXTENSION_VERSION}`}
                target="_blank"
                rel="noreferrer noopener"
              />
              <SettingsRow
                icon={<FavoriteBorder fontSize="small" />}
                title={t('optionsPage.help.feedback', 'Provide Feedback')}
                external
                href={`${FEEDBACK_FORM}?ID=${data.id}&Version=${EXTENSION_VERSION}`}
                target="_blank"
                rel="noreferrer noopener"
              />
            </SettingsGroup>
          </Box>

          <Footer />
        </Box>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}
