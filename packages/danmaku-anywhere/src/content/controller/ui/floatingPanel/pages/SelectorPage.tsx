import type { Season } from '@danmaku-anywhere/danmaku-converter'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isPersistedSeason } from '@/common/anime/utils'
import { SeasonGrid } from '@/common/components/Season/SeasonGrid'
import { isCustomSeason } from '@/common/danmaku/utils'
import {
  type SeasonSelection,
  usePopup,
} from '@/content/controller/store/popupStore'

export const SelectorPage = () => {
  const { t } = useTranslation()

  const selection = usePopup((state) => state.selection)

  if (!selection || selection.seasons.length === 0) {
    return (
      <Box
        sx={{
          p: 2,
        }}
      >
        <Typography variant="h6">
          {t('selectorPage.noAnimeFound', 'Nothing to select from')}
        </Typography>
      </Box>
    )
  }

  return <SeasonSelector key={selection.id} selection={selection} />
}

function SeasonSelector({ selection }: { selection: SeasonSelection }) {
  const { t } = useTranslation()

  const selectorBoxRef = useRef<HTMLDivElement>(undefined)
  const [selectedSeason, setSelectedSeason] = useState<Season>()
  const [applying, setApplying] = useState(false)

  const handleSeasonSelect = (season: Season) => {
    setSelectedSeason(season)
    selectorBoxRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  const handleApply = async () => {
    if (!selectedSeason) {
      return
    }
    setApplying(true)
    try {
      await selection.apply(selectedSeason)
    } finally {
      setApplying(false)
    }
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
      }}
    >
      <Box
        sx={{
          p: 2,
        }}
      >
        <Typography variant="body1">
          {t(
            'selectorPage.selectAnime',
            'Multiple matches found for {{name}}, please select',
            { name: selection.label }
          )}
        </Typography>
        <SeasonGrid
          data={selection.seasons}
          onSelectionChange={([season]) => {
            if (!season) {
              setSelectedSeason(undefined)
              return
            }
            if (!isCustomSeason(season) && isPersistedSeason(season)) {
              handleSeasonSelect(season)
            }
          }}
          disableMenu
          enableSelection
          singleSelect
        />
      </Box>
      <Divider />
      <Box
        ref={selectorBoxRef}
        sx={{
          my: 2,
          px: 2,
        }}
      >
        <Stack
          direction="column"
          spacing={2}
          sx={{
            alignItems: 'flex-start',
          }}
        >
          <Button
            type="submit"
            loading={applying}
            variant="contained"
            size="small"
            onClick={handleApply}
            disabled={!selectedSeason}
          >
            {t('common.apply', 'Apply')}
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
