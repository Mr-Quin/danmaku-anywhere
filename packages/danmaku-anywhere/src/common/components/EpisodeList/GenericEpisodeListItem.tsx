import type { CustomEpisode } from '@danmaku-anywhere/danmaku-converter'

import type { ParsedPlayUrl } from '@danmaku-anywhere/danmaku-provider/generic'
import {
  CircularProgress,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

type BaseEpisodeListItemProps = {
  isLoading?: boolean
  onClick: (episode: ParsedPlayUrl) => void
  episode: ParsedPlayUrl
  danmaku?: CustomEpisode
  disabled?: boolean
}

export const GenericEpisodeListItem = ({
  isLoading,
  onClick,
  episode,
  danmaku,
  disabled,
}: BaseEpisodeListItemProps) => {
  const { t } = useTranslation()

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => onClick(episode)}
        disabled={isLoading || disabled}
      >
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
              danmaku
                ? `${t('danmaku.commentCounted', {
                    count: danmaku.commentCount,
                  })}`
                : null
            }
          />
        </Tooltip>
        {isLoading && (
          <CircularProgress size={24} sx={{ color: 'text.primary' }} />
        )}
      </ListItemButton>
    </ListItem>
  )
}
