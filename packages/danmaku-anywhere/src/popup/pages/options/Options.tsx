import { GitHub, Launch } from '@mui/icons-material'
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { docsLink } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '../../layout/OptionsPageLayout'
import { LanguageListItem } from './components/LanguageListItem'
import { Version } from './components/Version'
import { AdvancedSection } from './sections/AdvancedSection'
import { DanmakuSourceSection } from './sections/DanmakuSourceSection'
import { HotkeySection } from './sections/HotkeySection'
import { RetentionPolicySection } from './sections/RetentionPolicySection'
import { ThemeSection } from './sections/ThemeSection'

const SectionDivider = ({ title }: { title: string }) => (
  <Box sx={{ my: 2 }}>
    <Typography variant="h6" color="primary" sx={{ mb: 1, px: 2 }}>
      {title}
    </Typography>
    <Divider />
  </Box>
)

export const Options = () => {
  const { t } = useTranslation()

  return (
    <OptionsPageLayout direction="up">
      <OptionsPageToolBar title={t('optionsPage.name')} />
      <Version />

      {/* General Settings */}
      <SectionDivider title={t('optionsPage.sections.general')} />
      <List disablePadding>
        <LanguageListItem />
      </List>

      {/* Danmaku Sources */}
      <SectionDivider title={t('optionsPage.pages.danmakuSource')} />
      <DanmakuSourceSection />

      {/* Theme Settings */}
      <SectionDivider title={t('optionsPage.pages.theme')} />
      <ThemeSection />

      {/* Hotkey Settings */}
      <SectionDivider title={t('optionsPage.pages.hotkeys')} />
      <HotkeySection />

      {/* Data Management */}
      <SectionDivider title={t('optionsPage.pages.retentionPolicy')} />
      <RetentionPolicySection />

      {/* Advanced Settings */}
      <SectionDivider title={t('optionsPage.pages.advanced')} />
      <AdvancedSection />

      {/* Help & Support */}
      <SectionDivider title={t('optionsPage.pages.help')} />
      <List disablePadding>
        <ListItem disablePadding>
          <ListItemButton
            component="a"
            href={docsLink('getting-started')}
            target="_blank"
          >
            <ListItemText>{t('optionsPage.help.docs')}</ListItemText>
            <Launch />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            component="a"
            href="https://github.com/Mr-Quin/danmaku-anywhere"
            target="_blank"
            rel="noreferrer"
          >
            <ListItemIcon>
              <GitHub />
            </ListItemIcon>
            <ListItemText>Github</ListItemText>
            <Launch />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemText>QQ</ListItemText>
          <Typography>531237584</Typography>
        </ListItem>
      </List>
    </OptionsPageLayout>
  )
}
