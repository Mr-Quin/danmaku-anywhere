import { Box, Skeleton, Typography } from '@mui/material'

import { TabLayout } from './TabLayout'

export const TabSkeleton = () => {
  return (
    <TabLayout>
      <Box p={2} height={1}>
        <Typography variant="h6" gutterBottom>
          <Skeleton variant="text" width={100} animation="wave" />
        </Typography>
        <Skeleton variant="rounded" height={100} animation="wave" />
      </Box>
    </TabLayout>
  )
}
