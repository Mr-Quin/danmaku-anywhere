import { Checklist, Delete, Download } from '@mui/icons-material'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Skeleton,
  Tooltip,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router'
import { useGetSeason } from '@/common/anime/queries/useSeasons'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { TabLayout } from '@/content/common/TabLayout'
import { TabToolbar } from '@/content/common/TabToolbar'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useGoBack } from '@/popup/hooks/useGoBack'
import { useStore } from '@/popup/store'
import { EpisodeList } from './EpisodeList'

export const EpisodePage = () => {
  const { t } = useTranslation()

  const goBack = useGoBack()

  const [searchParams] = useSearchParams()

  const isCustom = searchParams.get('type') === 'custom'

  const {
    enableEpisodeSelection,
    toggleEpisodeSelection,
    setSelectedEpisodes,
    selectedEpisodes,
  } = useStore.use.danmaku()

  useEffect(() => {
    toggleEpisodeSelection(false)
    setSelectedEpisodes([])
  }, [])

  const handleToggleEpisodeSelection = () => {
    if (enableEpisodeSelection) {
      toggleEpisodeSelection(false)
      setSelectedEpisodes([])
    } else {
      toggleEpisodeSelection(true)
    }
  }

  const { exportMany } = useExportDanmaku()
  const deleteMutation = useDeleteEpisode()

  const [showDialog, setShowDialog] = useState(false)

  const handleClose = () => {
    setShowDialog(false)
  }

  const handleDelete = () => {
    deleteMutation.mutate(
      {
        isCustom,
        filter: { ids: selectedEpisodes },
      },
      {
        onSuccess: () => {
          handleClose()
        },
      }
    )
  }

  const handleExport = () => {
    exportMany.mutate({
      isCustom,
      filter: { ids: selectedEpisodes },
    })
  }

  const getTitle = () => {
    if (isCustom) return t('danmaku.local')

    /**
     *  conditionally calling hooks here, not ideal
     *  but since isCustom shouldn't change for the lifetime of this component, it's fine
     */
    const params = useParams()

    const seasonId = params.seasonId ? Number.parseInt(params.seasonId) : 0

    const { data: seasons, isLoading } = useGetSeason({
      id: seasonId,
    })

    if (isLoading) return <Skeleton />

    return seasons?.[0].title
  }

  return (
    <TabLayout>
      <TabToolbar title={getTitle()} showBackButton onGoBack={goBack}>
        <Tooltip title={t('danmaku.export')}>
          <span>
            <IconButton
              onClick={handleExport}
              disabled={selectedEpisodes.length === 0}
            >
              <Download />
            </IconButton>
          </span>
        </Tooltip>
        <IconButton
          onClick={() => {
            setShowDialog(true)
          }}
          disabled={selectedEpisodes.length === 0}
        >
          <Delete />
        </IconButton>

        <IconButton
          onClick={handleToggleEpisodeSelection}
          color={enableEpisodeSelection ? 'primary' : 'default'}
        >
          <Checklist />
        </IconButton>
      </TabToolbar>
      <EpisodeList />
      <Dialog open={showDialog} onClose={handleClose}>
        <DialogTitle>{t('common.confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('danmakuPage.confirmDeleteMessage')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            autoFocus
            disabled={deleteMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            loading={deleteMutation.isPending}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </TabLayout>
  )
}
