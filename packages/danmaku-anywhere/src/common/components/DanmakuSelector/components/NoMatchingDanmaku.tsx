import { Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface NoMatchingDanmakuProps {
  query: string
  onClearFilter: () => void
}

export const NoMatchingDanmaku = ({
  query,
  onClearFilter,
}: NoMatchingDanmakuProps) => {
  const { t } = useTranslation()
  const trimmed = query.trim()

  return (
    <Stack
      data-testid="library-no-matches"
      sx={{ p: 4, alignItems: 'center', gap: 1 }}
    >
      <Typography sx={{ textAlign: 'center', wordBreak: 'break-word' }}>
        {trimmed
          ? t('mountPage.noMatchesFor', 'No matches for "{{query}}"', {
              query: trimmed,
            })
          : t(
              'mountPage.noMatchesForSources',
              'No danmaku from the selected sources'
            )}
      </Typography>
      <Button
        onClick={onClearFilter}
        variant="text"
        sx={{ textTransform: 'none' }}
      >
        {t('mountPage.clearFilter', 'Clear filter')}
      </Button>
    </Stack>
  )
}
