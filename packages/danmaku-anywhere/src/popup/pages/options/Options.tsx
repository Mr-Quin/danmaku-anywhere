import { ChevronRight } from '@mui/icons-material'
import type { ListItemButtonProps } from '@mui/material'
import {
  Icon,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'

import { OptionsPageLayout } from '../../layout/OptionsPageLayout'

import { LanguageListItem } from './components/LanguageListItem'

import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { DebugOption } from '@/popup/pages/options/components/DebugOption'
import { SimplifiedSearchListItem } from '@/popup/pages/options/components/SimplifiedSearchListItem'
import { Version } from '@/popup/pages/options/components/Version'

const OptionsListItem = ({
  title,
  ...rest
}: { title: string } & ListItemButtonProps) => {
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
              <>{title}</>
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
          <SimplifiedSearchListItem />
          <DebugOption />
        </List>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}
