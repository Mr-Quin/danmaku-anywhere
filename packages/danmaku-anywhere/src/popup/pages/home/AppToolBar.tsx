import { Menu, Search as SearchIcon, Settings } from '@mui/icons-material'
import {
  AppBar,
  Box,
  Fade,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputBase,
  LinearProgress,
  Stack,
  Toolbar,
  Typography,
  alpha,
  styled,
} from '@mui/material'
import { type ChangeEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { StyledEnableSwitch } from '@/common/components/StyledEnableSwitch'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'
import { useEnvironment } from '@/popup/context/Environment'
import { useStore } from '@/popup/store'

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}))

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 2),

    transition: theme.transitions.create(['width', 'color']),
    color: theme.palette.text.secondary,
    '&:focus': {
      color: 'inherit',
    },
    [theme.breakpoints.up('sm')]: {
      width: '24ch',
      '&:focus': {
        width: '32ch',
      },
    },
  },
}))

const SearchBar = () => {
  const { t } = useTranslation()
  const { setKeyword, keyword } = useStore.use.player()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState(keyword)
  const [isFocused, setIsFocused] = useState(false)

  const handleSearch = (keyword: string) => {
    navigate('/videoSearch')
    setKeyword(keyword)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSearch(searchTerm)
      }}
    >
      <Search>
        <StyledInputBase
          placeholder={t('tabs.videoSearch')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <IconButton
          type="submit"
          disabled={!searchTerm}
          sx={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            color: isFocused ? 'inherit' : 'text.secondary',
            transition: (theme) => theme.transitions.create(['color']),
          }}
        >
          <SearchIcon />
        </IconButton>
      </Search>
    </form>
  )
}

export const AppToolBar = () => {
  const { t } = useTranslation()
  const { partialUpdate, data: options } = useExtensionOptions()
  const { isPopup } = useEnvironment()
  const isSmallScreen = useIsSmallScreen()
  const navigate = useNavigate()
  const isAnyLoading = useAnyLoading()
  const { setOpen } = useStore.use.drawer()

  const handleEnable = async (event: ChangeEvent<HTMLInputElement>) => {
    await partialUpdate({
      enabled: event.target.checked,
    })
  }

  const showDrawerMenu = !isPopup && isSmallScreen

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: (theme) =>
          // in desktop mode, the app bar shows on top of the drawer,
          // but in mobile mode, the app bar shows on top of a drawer menu
          showDrawerMenu ? theme.zIndex.appBar : theme.zIndex.drawer + 1,
      }}
    >
      <Fade in={isAnyLoading} unmountOnExit>
        <Box position="absolute" top={0} left={0} width={1}>
          <LinearProgress sx={{ height: '1px' }} />
        </Box>
      </Fade>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center">
          {showDrawerMenu && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={() => setOpen(true)}
              edge="start"
              sx={[
                {
                  mr: 2,
                },
              ]}
            >
              <Menu />
            </IconButton>
          )}
          <Typography variant="h1" fontSize={20}>
            Danmaku Anywhere
          </Typography>
        </Stack>
        {!isPopup && <SearchBar />}
        <Stack direction="row">
          {isPopup && (
            <FormGroup>
              <FormControlLabel
                control={
                  <StyledEnableSwitch
                    checked={options.enabled}
                    onChange={handleEnable}
                    size="small"
                  />
                }
                label={t('common.enable')}
                labelPlacement="top"
                slotProps={{
                  typography: {
                    variant: 'caption',
                  },
                }}
                sx={{ m: 0 }}
              />
            </FormGroup>
          )}
          <IconButton
            sx={{ ml: 2 }}
            onClick={() => {
              navigate('/options')
            }}
            edge="end"
          >
            <Settings />
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
