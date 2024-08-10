import { ListItem, Skeleton } from '@mui/material'

export const ListItemSkeleton = () => {
  return (
    <ListItem>
      <Skeleton
        variant="text"
        width="100%"
        height={40}
        animation="wave"
      ></Skeleton>
    </ListItem>
  )
}
