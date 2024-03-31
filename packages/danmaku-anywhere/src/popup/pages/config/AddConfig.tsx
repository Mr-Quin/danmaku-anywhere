import { Box, Slide, Paper } from '@mui/material'
import { useNavigate, useOutletContext } from 'react-router-dom'

import { MountConfigEditor } from './MountConfigEditor'

import type { MountConfig } from '@/common/constants/mountConfig'

export const AddConfigPage = ({ edit }: { edit: boolean }) => {
  const navigate = useNavigate()

  const config = useOutletContext<MountConfig>()

  return (
    <Box position="absolute" top={0} zIndex={1} width={1}>
      <Slide direction="up" in mountOnEnter unmountOnExit>
        <Paper sx={{ height: '100vh' }}>
          <MountConfigEditor
            editConfig={config}
            goBack={() => {
              navigate(-1)
            }}
            edit={edit}
          />
        </Paper>
      </Slide>
    </Box>
  )
}
