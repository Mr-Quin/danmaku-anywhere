import type { EpisodeLite } from '@danmaku-anywhere/danmaku-converter'
import {
  type CustomEpisodeLite,
  DanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import { Box, Stack, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useTranslation } from 'react-i18next'
import {
  createSearchParams,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'
import { NothingHere } from '@/common/components/NothingHere'
import { useCustomEpisodeLite } from '@/common/danmaku/queries/useCustomEpisodes'
import { useEpisodesLite } from '@/common/danmaku/queries/useEpisodes'
import { isProvider } from '@/common/danmaku/utils'
import { useStore } from '@/popup/store'

export const EpisodeList = () => {
  const { t } = useTranslation()

  const params = useParams()

  const [searchParams] = useSearchParams()

  const isCustom = searchParams.get('type') === 'custom'

  const seasonId = params.seasonId ? Number.parseInt(params.seasonId) : 0

  const {
    data: episodes,
    isLoading,
    error,
  } = isCustom
    ? useCustomEpisodeLite({ all: true })
    : useEpisodesLite({
        seasonId,
      })

  // rely on ErrorBoundary to catch errors
  if (error) {
    throw error
  }

  const navigate = useNavigate()

  const { enableEpisodeSelection, setSelectedEpisodes } = useStore.use.danmaku()

  type EpisodeRow = EpisodeLite | CustomEpisodeLite

  const columns: GridColDef<EpisodeRow>[] = [
    {
      field: 'title',
      headerName: t('anime.title'),
      flex: 1,
      minWidth: 200,
      renderCell: (params) => {
        const episode = params.row

        return (
          <Box
            height="100%"
            display="flex"
            flexDirection="column"
            justifyContent="center"
          >
            <Typography
              variant="body2"
              component="a"
              title={episode.title}
              overflow="hidden"
              textOverflow="ellipsis"
              color="inherit"
              href={`${episode.id}`}
              onClick={(e) => {
                e.preventDefault()
                if (enableEpisodeSelection) return
                navigate({
                  pathname: `${episode.id}`,
                  search: createSearchParams({
                    type: isProvider(episode, DanmakuSourceType.Custom)
                      ? 'custom'
                      : 'remote',
                  }).toString(),
                })
              }}
            >
              {params.row.title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              {t('danmaku.commentCounted', {
                count: episode.commentCount,
              })}
            </Typography>
          </Box>
        )
      },
    },
  ]

  return (
    <Box flexGrow={1} position="relative">
      <Stack
        height="100%"
        width="100%"
        position="absolute"
        flexDirection="column"
      >
        <DataGrid
          rows={episodes}
          columns={columns}
          rowHeight={60}
          checkboxSelection={enableEpisodeSelection}
          getRowId={(row) => row.id}
          onRowSelectionModelChange={(model) => {
            setSelectedEpisodes(Array.from(model.ids) as number[])
          }}
          disableColumnSelector
          disableRowSelectionOnClick={!enableEpisodeSelection}
          loading={isLoading}
          slots={{
            noRowsOverlay: () => <NothingHere />,
          }}
          slotProps={{
            loadingOverlay: {
              variant: 'linear-progress',
              noRowsVariant: 'skeleton',
            },
          }}
          sx={{
            background: 'none',
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-cell:focus-within': {
              outline: 'none',
            },
          }}
        />
      </Stack>
    </Box>
  )
}
