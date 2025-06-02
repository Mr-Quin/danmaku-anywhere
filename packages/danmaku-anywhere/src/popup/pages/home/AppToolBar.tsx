import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Settings,
} from '@mui/icons-material'
import {
  AppBar,
  Box,
  Container,
  Fade,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputBase,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  alpha,
  styled,
} from '@mui/material'
import { type ChangeEvent, type MouseEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { StyledEnableSwitch } from '@/common/components/StyledEnableSwitch'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { useIsSmallScreen } from '@/content/controller/common/hooks/useIsSmallScreen'
import { useEnvironment } from '@/popup/context/Environment'
import { tabs } from '@/popup/pages/home/tabs'
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

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
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
        <SearchIconWrapper>
          <SearchIcon />
        </SearchIconWrapper>
        <StyledInputBase
          placeholder={t('tabs.videoSearch')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Search>
    </form>
  )
}

export const AppToolBar = () => {
  const { partialUpdate, data: options } = useExtensionOptions()
  const { isPopup } = useEnvironment()
  const isSmallScreen = useIsSmallScreen()

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(menuAnchorEl)

  const navigate = useNavigate()
  const isAnyLoading = useAnyLoading()

  const { t } = useTranslation()

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleTabClick = (path: string) => {
    navigate(path)
    handleMenuClose()
  }

  const handleEnable = async (event: ChangeEvent<HTMLInputElement>) => {
    await partialUpdate({
      enabled: event.target.checked,
    })
  }

  return (
    <AppBar position="sticky">
      <Fade in={isAnyLoading} unmountOnExit>
        <Box position="absolute" top={0} left={0} width={1}>
          <LinearProgress sx={{ height: '1px' }} />
        </Box>
      </Fade>
      <Container disableGutters={!isPopup && !isSmallScreen}>
        <Toolbar sx={{ justifyContent: 'space-between' }} disableGutters>
          <Stack direction="row" alignItems="center">
            {!isPopup && (
              <>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  onClick={handleMenuOpen}
                  onMouseEnter={handleMenuOpen}
                  // onMouseLeave={handleMenuClose}
                  edge="start"
                  sx={[
                    {
                      mr: 2,
                    },
                  ]}
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={menuAnchorEl}
                  open={menuOpen}
                  onClose={handleMenuClose}
                  disableScrollLock
                  disableAutoFocus
                  disableEnforceFocus
                  // disablePortal
                  hideBackdrop
                  // hidden
                  sx={{
                    '& .MuiPaper-root': {
                      width: isSmallScreen ? 'calc(100% - 32px)' : 'auto',
                      maxWidth: '100%',
                      marginLeft: isSmallScreen ? '16px' : '0',
                      marginRight: isSmallScreen ? '16px' : '0',
                    },
                  }}
                >
                  {tabs.map((tab) => (
                    <MenuItem
                      key={tab.path}
                      onClick={() => handleTabClick(tab.path)}
                    >
                      {t(tab.label)}
                    </MenuItem>
                  ))}
                </Menu>
              </>
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
      </Container>
    </AppBar>
  )
}
