import { Box, Typography } from '@mui/material'

export function SectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  )
}
