import { OpenInNewTwoTone } from '@mui/icons-material'
import { Box, Typography } from '@mui/material'
import type { LinkProps } from 'react-router-dom'
import { Link } from 'react-router-dom'

export const ExternalLink = ({ children, ...props }: LinkProps) => {
  return (
    <Link {...props}>
      <Box component="span" display="inline-flex" alignItems="center">
        <Typography component="span" variant="inherit" color="primary">
          {children}
        </Typography>
        <OpenInNewTwoTone fontSize="inherit" color="primary" />
      </Box>
    </Link>
  )
}
