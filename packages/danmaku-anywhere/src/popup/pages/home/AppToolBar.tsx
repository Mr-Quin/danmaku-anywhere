import { Settings } from '@mui/icons-material'
import {
  AppBar,
  Box,
  Fade,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  Switch,
  Toolbar,
  Typography,
} from '@mui/material'
import { useIsFetching } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { useExtensionOptions } from '@/common/hooks/useExtensionOptions'

export const AppToolBar = () => {
  const { partialUpdate, data: options } = useExtensionOptions()

  const handleEnable = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await partialUpdate({
      enabled: event.target.checked,
    })
  }

  const navigate = useNavigate()
  const isFetching = useIsFetching() > 0

  return (
    <AppBar position="static">
      <Toolbar>
        <Fade in={isFetching} unmountOnExit>
          <Box position="absolute" top={0} left={0} width={1}>
            <LinearProgress sx={{ height: '1px' }} />
          </Box>
        </Fade>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Danmaku Anywhere
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={options.enabled}
                onChange={handleEnable}
                size="small"
              />
            }
            label="Enable"
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
