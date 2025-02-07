import { GitHub } from '@mui/icons-material'
import { Box, IconButton, Stack, Typography } from '@mui/material'

import packageJson from '../../../../../package.json'

export const Version = () => {
  return (
    <Box
      position="absolute"
      bottom={(theme) => theme.spacing(1)}
      left={(theme) => theme.spacing(1)}
    >
      <Stack direction="row" alignItems="flex-end">
        <Typography variant="caption" color="text.disabled">
          v{packageJson.version}
        </Typography>
        <IconButton
          sx={{
            color: 'text.disabled',
          }}
          size="small"
          onClick={() => {
            window.open(packageJson.repository, '_blank')
          }}
        >
          <GitHub />
        </IconButton>
      </Stack>
    </Box>
  )
}
