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

type AppToolBarProps = {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

export const AppToolBar = ({ drawerOpen, setDrawerOpen }: AppToolBarProps) => {
  const { partialUpdate, data: options } = useExtensionOptions()
  const { isPopup } = useEnvironment()

  const navigate = useNavigate()
  const isAnyLoading = useAnyLoading()

  const [searchTerm, setSearchTerm] = useState('')

  const { setKeyword } = useStore.use.player()

  const { t } = useTranslation()

  const handleEnable = async (event: ChangeEvent<HTMLInputElement>) => {
    await partialUpdate({
      enabled: event.target.checked,
    })
  }

  const handleSearch = (keyword: string) => {
    navigate('/player')
    setKeyword(keyword)
  }

  return (
    <AppBar position="static">
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Fade in={isAnyLoading} unmountOnExit>
          <Box position="absolute" top={0} left={0} width={1}>
            <LinearProgress sx={{ height: '1px' }} />
          </Box>
        </Fade>
        <Stack direction="row">
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(!drawerOpen)}
            edge="start"
            sx={[
              {
                mr: 2,
              },
              drawerOpen && { display: 'none' },
            ]}
          >
            <Menu />
          </IconButton>
          <Typography variant="h1" fontSize={20}>
            Danmaku Anywhere
          </Typography>
        </Stack>
        {!isPopup && (
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
                placeholder="Search…"
                inputProps={{ 'aria-label': 'search' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Search>
          </form>
        )}
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
