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
import { Outlet, useNavigate } from 'react-router-dom'

import { OptionsLayout } from './components/OptionsLayout'

import { useThemeContext } from '@/common/style/Theme'

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
  const { colorScheme, setColorScheme } = useThemeContext()
  const navigate = useNavigate()

  return (
    <>
      <OptionsLayout title="Options">
        <List disablePadding>
          <OptionsListItem
            title="Edit Permissions"
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
      </OptionsLayout>
      <Outlet />
    </>
  )
}
