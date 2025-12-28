import { ChevronRight, Launch } from '@mui/icons-material'
import {
  Icon,
  List,
  ListItem,
  ListItemButton,
  type ListItemButtonProps,
  ListItemText,
  Stack,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate, useSearchParams } from 'react-router'
import { EXTENSION_VERSION } from '@/common/constants'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { Version } from '@/popup/pages/options/components/Version'
import { OptionsPageLayout } from '../../layout/OptionsPageLayout'
import { LanguageListItem } from './components/LanguageListItem'

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
  const { data } = useExtensionOptions()
  const [searchParams] = useSearchParams()

  return (
    <>
      <OptionsPageLayout direction="up">
        <OptionsPageToolBar
          leftElement={
            searchParams.get('from') === 'content' ? false : undefined
          }
          title={t('optionsPage.name', 'Options')}
        />
        <Version />
        <List disablePadding>
          <LanguageListItem />
          <OptionsListItem
            title={t('optionsPage.pages.aiProviders', 'AI Providers')}
            onClick={() => navigate('/ai-providers')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.retentionPolicy', 'Retention Policy')}
            onClick={() => navigate('retention-policy')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.hotkeys', 'Hotkeys')}
            onClick={() => navigate('hotkeys')}
          />

          <OptionsListItem
            title={t('optionsPage.pages.player', 'Player Settings')}
            onClick={() => navigate('player')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.advanced', 'Advanced')}
            onClick={() => navigate('advanced')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.help', '关于')}
            onClick={() => navigate('help')}
          />
          <ListItem disablePadding>
            <ListItemButton
              component="a"
              href={`https://forms.clickup.com/90131020449/f/2ky3men1-933/ULQ3OZ8QYRXIJ5HACI?ID=${data.id}&Version=${EXTENSION_VERSION}`}
              target="_blank"
            >
              <ListItemText>
                {t('optionsPage.help.reportBug', 'Report Bug')}
              </ListItemText>
              <Launch />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component="a"
              href={`https://forms.clickup.com/90131020449/f/2ky3men1-873/D9MSB7XJYAFS02Q9NO?ID=${data.id}&Version=${EXTENSION_VERSION}`}
              target="_blank"
            >
              <ListItemText>
                {t('optionsPage.help.feedback', 'Provide feedback')}
              </ListItemText>
              <Launch />
            </ListItemButton>
          </ListItem>
        </List>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}
