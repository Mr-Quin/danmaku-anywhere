import { ChevronRight } from '@mui/icons-material'
import type { ListItemButtonProps } from '@mui/material'
import {
  Icon,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router-dom'

import { OptionsPageLayout } from '../../layout/OptionsPageLayout'

import { LanguageListItem } from './components/LanguageListItem'

import { useThemeContext } from '@/common/style/Theme'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
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
  const { colorScheme, setColorScheme } = useThemeContext()
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
            title={t('optionsPage.pages.permissions')}
            onClick={() => navigate('permissions')}
          />
          {false && (
            <ListItem
              disablePadding
              secondaryAction={
                <Switch
                  checked={colorScheme === 'system'}
                  onChange={() => {
                    setColorScheme(colorScheme === 'system' ? 'dark' : 'system')
                  }}
                />
              }
            >
              <ListItemButton>
                <ListItemText primary="Theme" />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}
