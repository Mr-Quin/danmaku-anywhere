import type {
  EpisodeLite,
  WithSeason,
} from '@danmaku-anywhere/danmaku-converter'
import {
  type CustomEpisodeLite,
  DanmakuSourceType,
} from '@danmaku-anywhere/danmaku-converter'
import { Refresh } from '@mui/icons-material'
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
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
import { useRefreshDanmaku } from '@/popup/hooks/useRefreshDanmaku'
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

  const { isPending, refreshDanmaku } = useRefreshDanmaku()

  const handleFetchDanmaku = async (episode: EpisodeRow) => {
    if (isProvider(episode, DanmakuSourceType.Custom)) return
    return refreshDanmaku(episode)
  }

  type EpisodeRow = WithSeason<EpisodeLite> | CustomEpisodeLite

  const actionColumn: GridColDef<EpisodeRow>[] = [
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const episode = params.row

        return (
          <Box
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {isPending ? (
              <CircularProgress size={24} />
            ) : (
              <IconButton
                onClick={() => handleFetchDanmaku(episode)}
                size="small"
                title={t('danmaku.refresh')}
              >
                <Refresh />
              </IconButton>
            )}
          </Box>
        )
      },
    },
  ]

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
    ...(!isCustom ? actionColumn : []),
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
