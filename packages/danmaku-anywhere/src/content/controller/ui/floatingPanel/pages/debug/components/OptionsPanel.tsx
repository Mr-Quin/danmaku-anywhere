import { Box, Typography } from '@mui/material'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'

export const OptionsPanel = () => {
  const { data: options } = useExtensionOptions()

  return (
    <Box p={1}>
      <Box mb={2}>
        <Typography
          variant="overline"
          color="primary"
          fontWeight="bold"
          letterSpacing={1}
          pl={0.5}
        >
          Extension Options
        </Typography>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1.5,
            fontSize: 10,
            fontFamily: 'monospace',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'auto',
            color: 'text.secondary',
          }}
        >
          {JSON.stringify(options, null, 2)}
        </Box>
      </Box>
    </Box>
  )
}
