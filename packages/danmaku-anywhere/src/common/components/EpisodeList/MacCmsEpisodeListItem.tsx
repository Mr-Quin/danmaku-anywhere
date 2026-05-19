import type { CustomEpisode } from '@danmaku-anywhere/danmaku-converter'
import type { MacCmsParsedPlayUrl } from '@danmaku-anywhere/danmaku-provider/maccms'
import { Check, Download } from '@mui/icons-material'
import {
  ButtonBase,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

type MacCmsEpisodeListItemProps = {
  isLoading?: boolean
  onClick: (episode: MacCmsParsedPlayUrl) => void
  episode: MacCmsParsedPlayUrl
  danmaku?: CustomEpisode
  index?: number
  disabled?: boolean
}

export const MacCmsEpisodeListItem = ({
  isLoading,
  onClick,
  episode,
  danmaku,
  index,
  disabled,
}: MacCmsEpisodeListItemProps) => {
  const { t } = useTranslation()

  const downloaded = !!danmaku
  const number = typeof index === 'number' ? String(index + 1) : ''

  const statusIcon = isLoading ? (
    <CircularProgress
      size={12}
      thickness={6}
      sx={{ color: 'text.secondary' }}
    />
  ) : downloaded ? (
    <Check sx={{ fontSize: 12, color: 'success.main' }} />
  ) : (
    <Download sx={{ fontSize: 12, color: 'text.secondary' }} />
  )

  return (
    <ButtonBase
      onClick={() => onClick(episode)}
      disabled={isLoading || disabled}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '3px 6px',
        borderRadius: 0.75,
        textAlign: 'left',
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-focusVisible': { bgcolor: 'action.hover' },
        '&.Mui-disabled': { opacity: 0.7 },
      }}
    >
      <Typography
        component="span"
        sx={{
          width: 18,
          flexShrink: 0,
          textAlign: 'right',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.2,
          color: 'text.secondary',
          lineHeight: 1,
        }}
      >
        {number}
      </Typography>
      <Tooltip
        title={episode.title}
        enterDelay={1000}
        enterNextDelay={1000}
        placement="top"
      >
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {episode.title}
          </Typography>
          {danmaku && (
            <Typography variant="caption" color="text.secondary">
              {t('danmaku.commentCounted', { count: danmaku.commentCount })}
            </Typography>
          )}
        </Stack>
      </Tooltip>
      {statusIcon}
    </ButtonBase>
  )
}
