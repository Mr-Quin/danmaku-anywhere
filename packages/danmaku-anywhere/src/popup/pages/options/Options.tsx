import {
  ChevronRight,
  DarkMode,
  DarkModeTwoTone,
  GitHub,
  Keyboard,
  KeyboardTwoTone,
} from '@mui/icons-material'
import type { ListItemButtonProps } from '@mui/material'
import {
  Divider,
  Icon,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'

import { OptionsPageLayout } from '../../layout/OptionsPageLayout'

import { LanguageListItem } from './components/LanguageListItem'

import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { Version } from '@/popup/pages/options/components/Version'

const OptionsListItem = ({
  title,
  icon,
  ...rest
}: { icon?: ReactNode; title: string } & ListItemButtonProps) => {
  return (
    <ListItem disablePadding>
      <ListItemButton {...rest}>
        <ListItemText
          primary={
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" gap={1} alignItems="center">
                {icon && <Icon>{icon}</Icon>}
                {title}
              </Stack>
              <Icon>
                <ChevronRight />
              </Icon>
            </Stack>
          }
        />
      </ListItemButton>
    </ListItem>
  )
}

export const Options = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <>
      <OptionsPageLayout direction="up">
        <OptionsPageToolBar title={t('optionsPage.name')} />
        <Version />
        <List disablePadding>
          <LanguageListItem />
          <OptionsListItem
            title={t('optionsPage.pages.danmakuSource')}
            onClick={() => navigate('danmaku-source')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.retentionPolicy')}
            onClick={() => navigate('retention-policy')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.hotkeys')}
            onClick={() => navigate('hotkeys')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.theme')}
            onClick={() => navigate('theme')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.advanced')}
            onClick={() => navigate('advanced')}
          />
        </List>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}
