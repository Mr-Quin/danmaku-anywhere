import { GitHub } from '@mui/icons-material'
import { Box, IconButton, Stack, Typography } from '@mui/material'
import { EXTENSION_REPO, EXTENSION_VERSION } from '@/common/constants'

export const Version = () => {
  return (
    <Box
      position="absolute"
      bottom={(theme) => theme.spacing(1)}
      left={(theme) => theme.spacing(1)}
    >
      <Stack direction="row" alignItems="flex-end">
        <Typography variant="caption" color="text.disabled">
          v{EXTENSION_VERSION}
        </Typography>
        <IconButton
          sx={{
            color: 'text.disabled',
          }}
          size="small"
          onClick={() => {
            window.open(EXTENSION_REPO, '_blank')
          }}
        >
          <GitHub />
        </IconButton>
      </Stack>
    </Box>
  )
}
