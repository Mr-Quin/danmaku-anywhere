import { Article, GitHub, Launch } from '@mui/icons-material'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { docsLink } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

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
          <ListItemIcon>
            <Article />
          </ListItemIcon>
          <ListItemText>{t('optionsPage.help.docs')}</ListItemText>
          <Launch />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton
          component="a"
          href="https://github.com/Mr-Quin/danmaku-anywhere"
          target="_blank"
        >
          <ListItemIcon>
            <GitHub />
          </ListItemIcon>
          <ListItemText>Github</ListItemText>
          <Launch />
        </ListItemButton>
      </ListItem>
      <ListItem>
        <ListItemIcon></ListItemIcon>
        <ListItemText>QQ</ListItemText>
        <Typography>531237584</Typography>
      </ListItem>
    </OptionsPageLayout>
  )
}
