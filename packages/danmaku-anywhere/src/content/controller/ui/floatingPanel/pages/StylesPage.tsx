import { Box } from '@mui/material'

import { DanmakuStylesForm } from '@/common/components/DanmakuStylesForm'

export const StylesPage = () => {
  return (
    <Box px={3} pb={2} flexGrow={1} sx={{ overflowX: 'hidden' }}>
      <DanmakuStylesForm />
    </Box>
  )
}
