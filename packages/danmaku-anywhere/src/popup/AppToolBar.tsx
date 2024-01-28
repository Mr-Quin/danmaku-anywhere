import {
  AppBar,
  FormControlLabel,
  FormGroup,
  Switch,
  Toolbar,
  Typography,
} from '@mui/material'

import { useExtensionOptions } from '@/common/hooks/useExtensionOptions'

export const AppToolBar = () => {
  const { partialUpdate, data: options } = useExtensionOptions()

  const handleEnableChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    await partialUpdate({
      enabled: event.target.checked,
    })
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Danmaku Anywhere
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={options?.enabled ?? false}
                onChange={handleEnableChange}
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
      </Toolbar>
    </AppBar>
  )
}
