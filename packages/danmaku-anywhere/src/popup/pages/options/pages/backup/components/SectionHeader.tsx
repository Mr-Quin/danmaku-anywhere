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
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', mb: 0.5 }}
      >
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  )
}
