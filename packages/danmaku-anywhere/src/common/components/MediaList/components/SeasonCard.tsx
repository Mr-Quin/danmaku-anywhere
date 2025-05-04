import { SeasonV1 } from '@/common/anime/types/v1/schema'
import {
  CoverImage,
  CoverImageSkeleton,
} from '@/common/components/MediaList/components/CoverImage'
import { HandleSeasonClick } from '@/common/components/MediaList/types'
import {
  CSSProperties,
  Card,
  CardActionArea,
  CardContent,
  Skeleton,
  Tooltip,
  Typography,
  alpha,
  styled,
} from '@mui/material'

interface CardCornerInfoProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

const CardCornerInfo = styled('div', {
  shouldForwardProp: (prop) => prop !== 'position',
})<CardCornerInfoProps>(({ theme, position = 'top-left' }) => {
  const styles: CSSProperties = {
    position: 'absolute',
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    padding: theme.spacing(1, 1),
    color: theme.palette.text.primary,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  }

  switch (position) {
    case 'top-right':
      styles.top = 0
      styles.right = 0
      styles.borderBottomLeftRadius = theme.shape.borderRadius
      break
    case 'bottom-left':
      styles.bottom = 0
      styles.left = 0
      styles.borderTopRightRadius = theme.shape.borderRadius
      break
    case 'bottom-right':
      styles.bottom = 0
      styles.right = 0
      styles.borderTopLeftRadius = theme.shape.borderRadius
      break
    case 'top-left':
    default:
      styles.top = 0
      styles.left = 0
      styles.borderBottomRightRadius = theme.shape.borderRadius
      break
  }

  return styles
})

type SeasonCardProps = {
  season: SeasonV1
  onClick: HandleSeasonClick
}

export const SeasonCard = ({ season, onClick }: SeasonCardProps) => {
  return (
    <Card>
      <CardActionArea onClick={() => onClick(season)}>
        <CoverImage src={season.imageUrl} alt={season.title}>
          {(season.episodeCount ?? 0) > 0 && (
            <CardCornerInfo position="top-right">
              {season.episodeCount}
            </CardCornerInfo>
          )}
          {season.year && (
            <CardCornerInfo position="top-left">{season.year}</CardCornerInfo>
          )}
        </CoverImage>
        <CardContent sx={{ py: 1.5, px: 1 }}>
          <Tooltip title={season.title} enterDelay={500} placement="top">
            <Typography component="div" variant="subtitle2" noWrap>
              {season.title}
            </Typography>
          </Tooltip>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export const SeasonCardSkeleton = () => {
  return (
    <Card>
      <CoverImageSkeleton />
      <CardContent>
        <Typography component="div">
          <Skeleton />
        </Typography>
      </CardContent>
    </Card>
  )
}
