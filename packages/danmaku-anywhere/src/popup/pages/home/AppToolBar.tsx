import { Settings } from '@mui/icons-material'
import {
  AppBar,
  Box,
  Fade,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  Toolbar,
  Typography,
} from '@mui/material'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { StyledEnableSwitch } from '@/common/components/StyledEnableSwitch'
import { useAnyLoading } from '@/common/hooks/useAnyLoading'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const AppToolBar = () => {
  const { partialUpdate, data: options } = useExtensionOptions()

  const handleEnable = async (event: ChangeEvent<HTMLInputElement>) => {
    await partialUpdate({
      enabled: event.target.checked,
    })
  }

  const navigate = useNavigate()
  const isAnyLoading = useAnyLoading()

  const { t } = useTranslation()

  return (
    <AppBar position="static">
      <Toolbar>
        <Fade in={isAnyLoading} unmountOnExit>
          <Box position="absolute" top={0} left={0} width={1}>
            <LinearProgress sx={{ height: '1px' }} />
          </Box>
        </Fade>
        <Typography variant="h1" fontSize={20} sx={{ flexGrow: 1 }}>
          Danmaku Anywhere
        </Typography>
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
        <IconButton
          sx={{ ml: 2 }}
          onClick={() => {
            navigate('/options')
          }}
          edge="end"
        >
          <Settings />
        </IconButton>
      </Toolbar>
    </AppBar>
  )
}
