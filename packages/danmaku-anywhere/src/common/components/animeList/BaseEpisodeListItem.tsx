import { Download, Update } from '@mui/icons-material'
import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Tooltip,
} from '@mui/material'

export interface BaseEpisodeListItemProps {
  episodeTitle: string
  isLoading?: boolean
  isFetched?: boolean
  secondaryText?: string
  showIcon?: boolean
  onClick?: () => void
}

export const BaseEpisodeListItem = ({
  episodeTitle,
  secondaryText,
  isLoading = false,
  isFetched = false,
  showIcon = false,
  onClick,
}: BaseEpisodeListItemProps) => {
  const getIcon = () => {
    if (!showIcon) return null
    if (isLoading) return <CircularProgress size={24} />
    if (isFetched) return <Update />
    return <Download />
  }

  return (
    <ListItem disablePadding>
      <ListItemButton onClick={onClick} disabled={isLoading}>
        <ListItemIcon>{getIcon()}</ListItemIcon>
        <Tooltip title={episodeTitle} enterDelay={500} placement="top">
          <ListItemText
            primary={episodeTitle}
            primaryTypographyProps={{
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
            secondary={secondaryText}
          />
        </Tooltip>
      </ListItemButton>
    </ListItem>
  )
}

export const BaseListItemSkeleton = () => {
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
