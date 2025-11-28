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
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router'
import { useGetSeason } from '@/common/anime/queries/useSeasons'
import { DrilldownMenu } from '@/common/components/DrilldownMenu'
import { TabLayout } from '@/common/components/layout/TabLayout'
import { TabToolbar } from '@/common/components/layout/TabToolbar'
import { useDeleteEpisode } from '@/common/danmaku/queries/useDeleteEpisode'
import { useExportDanmaku } from '@/popup/hooks/useExportDanmaku'
import { useExportXml } from '@/popup/hooks/useExportXml'
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

  const exportDanmaku = useExportDanmaku()
  const exportXml = useExportXml()
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

  const handleBackup = () => {
    if (isCustom) {
      exportDanmaku.mutate({
        customFilter: { ids: selectedEpisodes },
      })
    } else {
      exportDanmaku.mutate({
        filter: { ids: selectedEpisodes },
      })
    }
  }

  const handleExportXml = () => {
    if (isCustom) {
      exportXml.mutate({
        customFilter: { ids: selectedEpisodes },
      })
    } else {
      exportXml.mutate({
        filter: { ids: selectedEpisodes },
      })
    }
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
        <DrilldownMenu
          icon={<Download />}
          ButtonProps={{
            disabled: selectedEpisodes.length === 0,
          }}
          items={[
            {
              id: 'backup',
              label: t('danmaku.backup'),
              icon: <Download />,
              onClick: handleBackup,
              disabled: exportDanmaku.isPending,
              loading: exportDanmaku.isPending,
            },
            {
              id: 'exportXml',
              label: t('danmaku.exportXml'),
              icon: <Download />,
              onClick: handleExportXml,
              disabled: exportXml.isPending,
              loading: exportXml.isPending,
            },
          ]}
        />
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
