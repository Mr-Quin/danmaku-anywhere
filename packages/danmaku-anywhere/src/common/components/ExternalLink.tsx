import { OpenInNewTwoTone } from '@mui/icons-material'
import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import type { LinkProps } from 'react-router'
import { Link } from 'react-router'

type ExternalLinkProps = LinkProps & {
  icon?: ReactNode
}

export const ExternalLink = ({
  children,
  icon,
  ...props
}: ExternalLinkProps) => {
  return (
    <Link {...props}>
      <Box component="span" display="inline-flex" alignItems="center">
        <Typography component="span" variant="inherit" color="primary">
          {children}
        </Typography>
        {icon ?? <OpenInNewTwoTone fontSize="inherit" color="primary" />}
      </Box>
    </Link>
  )
}
