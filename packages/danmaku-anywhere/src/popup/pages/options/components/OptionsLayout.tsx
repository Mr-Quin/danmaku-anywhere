import { ChevronLeft } from '@mui/icons-material'
import {
  AppBar,
  Box,
  IconButton,
  Paper,
  Slide,
  Toolbar,
  Typography,
} from '@mui/material'
import { Suspense, type PropsWithChildren } from 'react'
import { useNavigate } from 'react-router-dom'

import { FullPageSpinner } from '@/common/components/FullPageSpinner'

type OptionsPageProps = PropsWithChildren<{
  title: string
  subpage?: boolean
}>

const OptionsBar = ({ title }: { title: string }) => {
  const navigate = useNavigate()

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
        <IconButton edge="start" onClick={() => navigate(-1)}>
          <ChevronLeft />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translate(-50%)',
          }}
        >
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

export const OptionsLayout = ({
  children,
  title,
  subpage,
}: OptionsPageProps) => {
  return (
    <Box position="absolute" top={0} zIndex={1} width={1}>
      <Slide direction={subpage ? 'left' : 'up'} in mountOnEnter unmountOnExit>
        <Paper sx={{ height: '100vh' }}>
          <OptionsBar title={title} />
          <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
        </Paper>
      </Slide>
    </Box>
  )
}
