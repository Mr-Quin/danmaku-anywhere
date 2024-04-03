import { Box, Typography } from '@mui/material'

import packageJson from '../../../../../package.json'

export const Version = () => {
  return (
    <Box
      position="absolute"
      bottom={(theme) => theme.spacing(1)}
      left={(theme) => theme.spacing(1)}
    >
      <Typography variant="caption" color="text.disabled">
        v{packageJson.version}
      </Typography>
    </Box>
  )
}
