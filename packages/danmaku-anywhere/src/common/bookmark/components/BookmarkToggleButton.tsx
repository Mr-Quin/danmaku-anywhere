import {
  type CustomSeason,
  DanmakuSourceType,
  type Season,
} from '@danmaku-anywhere/danmaku-converter'
import { Favorite, FavoriteBorder } from '@mui/icons-material'
import { Button, CircularProgress, Tooltip } from '@mui/material'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useBookmarkAdd } from '@/common/bookmark/queries/useBookmarkAdd'
import { useBookmarkDeleteBySeason } from '@/common/bookmark/queries/useBookmarkDelete'
import { useBookmarkedSeasonIds } from '@/common/bookmark/queries/useBookmarks'
import { isProvider } from '@/common/danmaku/utils'

interface BookmarkToggleButtonProps {
  season: Season | CustomSeason
}

export const BookmarkToggleButton = ({
  season,
}: BookmarkToggleButtonProps): ReactElement | null => {
  const { t } = useTranslation()

  const { data: bookmarkedSeasonIds, isLoading } = useBookmarkedSeasonIds()

  const bookmarkAdd = useBookmarkAdd()
  const bookmarkDelete = useBookmarkDeleteBySeason()

  if (isProvider(season, DanmakuSourceType.MacCMS)) {
    return null
  }

  const isBookmarked = bookmarkedSeasonIds?.has(season.id) ?? false
  const isPending =
    isLoading || bookmarkAdd.isPending || bookmarkDelete.isPending

  const handleToggle = () => {
    if (isPending) {
      return
    }
    if (isBookmarked) {
      bookmarkDelete.mutate(season.id)
    } else {
      bookmarkAdd.mutate(season.id)
    }
  }

  const icon = isPending ? (
    <CircularProgress size={12} thickness={6} />
  ) : isBookmarked ? (
    <Favorite sx={{ fontSize: 12 }} />
  ) : (
    <FavoriteBorder sx={{ fontSize: 12 }} />
  )

  return (
    <Tooltip
      title={t(
        'bookmark.tooltip',
        'Save to your library to see all episodes anytime — including ones you have not downloaded yet.'
      )}
      placement="bottom-end"
    >
      <Button
        onClick={handleToggle}
        disabled={isPending}
        size="small"
        variant={isBookmarked ? 'soft' : 'text'}
        color="primary"
        startIcon={icon}
        sx={{ minHeight: 26, paddingInline: 1 }}
      >
        {isBookmarked
          ? t('bookmark.remove', 'Following')
          : t('bookmark.add', 'Follow')}
      </Button>
    </Tooltip>
  )
}
