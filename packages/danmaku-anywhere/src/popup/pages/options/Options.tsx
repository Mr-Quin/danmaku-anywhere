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
import { BUG_FORM, EXTENSION_VERSION, FEEDBACK_FORM } from '@/common/constants'
import { useAuthSession } from '@/common/hooks/user/useAuthSession'
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
  const { data: extensionData } = useExtensionOptions()
  const [searchParams] = useSearchParams()
  const { data: sessionInfo, isLoading } = useAuthSession()

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
          <OptionsListItem
            title={
              sessionInfo
                ? `${t('optionsPage.auth.signedInAs', 'Signed in as')}: ${sessionInfo.user.name}`
                : t('optionsPage.auth.signIn', 'Sign In')
            }
            disabled={isLoading}
            onClick={() => navigate('auth')}
          />
          <LanguageListItem />
          <OptionsListItem
            title={t('optionsPage.pages.dataManagement', 'Data Management')}
            onClick={() => navigate('data-management')}
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
            title={t('optionsPage.pages.backup', 'Backup & Restore')}
            onClick={() => navigate('backup')}
          />
          <OptionsListItem
            title={t('optionsPage.pages.help', '关于')}
            onClick={() => navigate('help')}
          />
          <ListItem disablePadding>
            <ListItemButton
              component="a"
              href={`${BUG_FORM}?ID=${extensionData.id}&Version=${EXTENSION_VERSION}`}
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
              href={`${FEEDBACK_FORM}?ID=${extensionData.id}&Version=${EXTENSION_VERSION}`}
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
