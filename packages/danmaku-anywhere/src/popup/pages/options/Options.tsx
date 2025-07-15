import {
  ChevronRight,
  DarkModeOutlined,
  LightModeOutlined,
  SettingsBrightnessOutlined,
} from '@mui/icons-material'
import type { ListItemButtonProps } from '@mui/material'
import {
  Box,
  ButtonGroup,
  Divider,
  Icon,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'
import { ColorMode } from '@/common/theme/enums'
import { useThemeContext } from '@/common/theme/Theme'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { Version } from '@/popup/pages/options/components/Version'
import { OptionsPageLayout } from '../../layout/OptionsPageLayout'
import { LanguageListItem } from './components/LanguageListItem'
import { DebugOption } from './pages/advanced/components/DebugOption'
import { SimplifiedSearchListItem } from './pages/advanced/components/SimplifiedSearchListItem'
import { ThemeButton } from './pages/theme/ThemeButton'

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
  const { colorMode, setColorMode } = useThemeContext()

  return (
    <>
      <OptionsPageLayout direction="up">
        <OptionsPageToolBar title={t('optionsPage.name')} />
        <Version />

        {/* Appearance Settings */}
        <Box px={2} py={1}>
          <Typography variant="h6" gutterBottom>
            {t('optionsPage.appearance', 'Appearance')}
          </Typography>
        </Box>

        <List disablePadding>
          <LanguageListItem />

          {/* Theme Selection */}
          <ListItem>
            <ListItemText
              primary={t('optionsPage.theme.colorMode.name')}
              secondary={
                <Box mt={1}>
                  <ButtonGroup variant="contained" fullWidth size="small">
                    <ThemeButton
                      icon={<LightModeOutlined />}
                      label={t('optionsPage.theme.colorMode.light')}
                      selected={colorMode === ColorMode.Light}
                      onClick={() => setColorMode(ColorMode.Light)}
                    />
                    <ThemeButton
                      icon={<SettingsBrightnessOutlined />}
                      label={t('optionsPage.theme.colorMode.system')}
                      selected={colorMode === ColorMode.System}
                      onClick={() => setColorMode(ColorMode.System)}
                    />
                    <ThemeButton
                      icon={<DarkModeOutlined />}
                      label={t('optionsPage.theme.colorMode.dark')}
                      selected={colorMode === ColorMode.Dark}
                      onClick={() => setColorMode(ColorMode.Dark)}
                    />
                  </ButtonGroup>
                </Box>
              }
            />
          </ListItem>
        </List>

        <Divider />

        {/* Functionality Settings */}
        <Box px={2} py={1}>
          <Typography variant="h6" gutterBottom>
            {t('optionsPage.functionality', 'Functionality')}
          </Typography>
        </Box>

        <List disablePadding>
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
        </List>

        <Divider />

        {/* Advanced Settings */}
        <Box px={2} py={1}>
          <Typography variant="h6" gutterBottom>
            {t('optionsPage.pages.advanced')}
          </Typography>
        </Box>

        <List disablePadding>
          <SimplifiedSearchListItem />
          <DebugOption />
        </List>

        <Divider />

        {/* Help */}
        <List disablePadding>
          <OptionsListItem
            title={t('optionsPage.pages.help')}
            onClick={() => navigate('help')}
          />
        </List>
      </OptionsPageLayout>
      <Outlet />
    </>
  )
}
