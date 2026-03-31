import {
  type CustomSeason,
  DanmakuSourceType,
  type Season,
} from '@danmaku-anywhere/danmaku-converter'
import { Bookmark, BookmarkBorder } from '@mui/icons-material'
import { CircularProgress, IconButton, Tooltip } from '@mui/material'
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

  return (
    <Tooltip
      title={
        isBookmarked
          ? t('bookmark.remove', 'Remove Bookmark')
          : t('bookmark.add', 'Bookmark')
      }
    >
      <span>
        <IconButton onClick={handleToggle} disabled={isPending} size="small">
          {isPending ? (
            <CircularProgress size={20} />
          ) : isBookmarked ? (
            <Bookmark />
          ) : (
            <BookmarkBorder />
          )}
        </IconButton>
      </span>
    </Tooltip>
  )
}
