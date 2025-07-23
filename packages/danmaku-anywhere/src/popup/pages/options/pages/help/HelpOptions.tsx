import { Article, GitHub, Launch, Numbers } from '@mui/icons-material'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { docsLink } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const HelpOptions = () => {
  const { t } = useTranslation()
  const { data } = useExtensionOptions()

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.help')} />
      <ListItem>
        <ListItemIcon>
          <Numbers />
        </ListItemIcon>
        <ListItemText>{t('optionsPage.help.version')}</ListItemText>
        <Typography>{chrome.runtime.getManifest().version}</Typography>
      </ListItem>
      {data.id && (
        <ListItem>
          <ListItemIcon>
            <Numbers />
          </ListItemIcon>
          <ListItemText>ID</ListItemText>
          <Typography>{data.id}</Typography>
        </ListItem>
      )}
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
        <ListItemIcon />
        <ListItemText>QQ</ListItemText>
        <Typography>531237584</Typography>
      </ListItem>
    </OptionsPageLayout>
  )
}
