import { ArrowBack } from '@mui/icons-material'
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export const OptionsBar = ({ title }: { title: string }) => {
  const navigate = useNavigate()

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
        <IconButton edge="start" onClick={() => navigate(-1)}>
          <ArrowBack />
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
