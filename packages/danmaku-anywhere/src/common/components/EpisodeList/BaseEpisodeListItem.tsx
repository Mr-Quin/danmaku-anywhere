import type {
  CustomEpisodeLite,
  EpisodeLite,
  EpisodeMeta,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import {
  Box,
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CoverImage } from '@/common/components/image/CoverImage'
import { isNotCustom } from '@/common/danmaku/utils'

const isEpisodeLite = (
  episode: WithSeason<EpisodeMeta> | CustomEpisodeLite
): episode is WithSeason<EpisodeLite> => {
  return 'id' in episode
}

type BaseEpisodeListItemProps<
  T extends WithSeason<EpisodeMeta> | CustomEpisodeLite,
> = {
  showImage?: boolean
  isLoading?: boolean
  onClick: (meta: T) => void
  renderSecondaryAction?: () => ReactNode
  episode: T
  disabled?: boolean
}

export const BaseEpisodeListItem = <
  T extends WithSeason<EpisodeMeta> | CustomEpisodeLite,
>({
  showImage = true,
  isLoading,
  onClick,
  renderSecondaryAction: renderSecondaryActionProp,
  episode,
  disabled,
}: BaseEpisodeListItemProps<T>) => {
  const { t } = useTranslation()

  const isLite = isEpisodeLite(episode)
  const isCustom = !isNotCustom(episode)

  const episodeLite = isLite ? episode : undefined

  // Remote episodes have a stable indexedId from the upstream provider.
  // Custom episodes don't, so fall back to the DB id (CustomEpisodeLite is
  // a DbEntity and always carries one). Avoid `episode.title` — titles can
  // collide and contain arbitrary characters.
  const testIdSuffix = isNotCustom(episode)
    ? episode.indexedId
    : (episode as CustomEpisodeLite).id
  const testId = `episode-list-item-${episode.provider}-${testIdSuffix}`

  const renderSecondaryAction = () => {
    if (renderSecondaryActionProp) {
      return renderSecondaryActionProp()
    }
    return null
  }

  return (
    <ListItem
      disablePadding
      secondaryAction={renderSecondaryAction()}
      data-testid={testId}
    >
      <ListItemButton
        onClick={() => onClick(episode)}
        disabled={isLoading || disabled}
      >
        {showImage && !isCustom && episode.imageUrl && (
          <Box width={40} mr={2} flexShrink={0}>
            <CoverImage src={episode.imageUrl} widthRatio={1} heightRatio={1} />
          </Box>
        )}
        <Tooltip
          title={episode.title}
          enterDelay={1000}
          enterNextDelay={1000}
          placement="top"
        >
          <ListItemText
            primary={episode.title}
            slotProps={{
              primary: {
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              },
            }}
            secondary={
              episodeLite
                ? `${new Date(episodeLite.timeUpdated).toLocaleDateString()} -  ${t(
                    'danmaku.commentCounted',
                    {
                      count: episodeLite.commentCount,
                    }
                  )}`
                : null
            }
          />
        </Tooltip>
        {!renderSecondaryActionProp && isLoading && (
          <CircularProgress size={24} sx={{ color: 'text.primary' }} />
        )}
      </ListItemButton>
    </ListItem>
  )
}
