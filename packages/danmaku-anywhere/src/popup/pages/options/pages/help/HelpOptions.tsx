import { docsLink } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'
import { GitHub, Launch } from '@mui/icons-material'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

export const HelpOptions = () => {
  const { t } = useTranslation()

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.help')} />
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
    </OptionsPageLayout>
  )
}
