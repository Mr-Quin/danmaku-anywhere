import type { DanDanAnimeSearchAPIParams } from '@danmaku-anywhere/danmaku-provider/ddp'
import { LoadingButton } from '@mui/lab'
import { Box, Stack, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useSessionState } from '@/common/storage/hooks/useSessionState'

export const SearchForm = ({
  onSearch,
  isLoading,
}: {
  onSearch: (params: DanDanAnimeSearchAPIParams) => void
  isLoading: boolean
}) => {
  const { t } = useTranslation()

  const [title, setTitle] = useSessionState('', 'search/title')

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch({ anime: title.trim() })
      }}
    >
      <Stack spacing={2}>
        <TextField
          label={t('searchPage.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
        />

        <LoadingButton
          type="submit"
          loading={isLoading}
          variant="contained"
          disabled={!title}
        >
          {t('common.search')}
        </LoadingButton>
      </Stack>
    </Box>
  )
}
