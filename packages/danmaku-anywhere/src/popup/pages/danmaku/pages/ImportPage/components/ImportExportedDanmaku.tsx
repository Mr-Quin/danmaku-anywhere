import { DialogContentText, Divider, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type {
  CustomDanmakuCacheImportDto,
  DanmakuCacheImportDto,
  DDPDanmakuCacheImportDto,
} from '@/common/danmaku/models/danmakuCache/dto'
import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import type { ImportParseResult } from '@/common/danmaku/types'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { ImportResultDialog } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportResultDialog'

interface ImportExportedDanmakuProps {
  data: ImportParseResult<DanmakuCacheImportDto[]>
  onClose: () => void
  open: boolean
}

const sortDanmakuCacheImportDto = (
  a: DanmakuCacheImportDto,
  b: DanmakuCacheImportDto
) => {
  if (a.meta.animeTitle === b.meta.animeTitle) {
    if (a.meta.episodeTitle && b.meta.episodeTitle) {
      return a.meta.episodeTitle.localeCompare(b.meta.episodeTitle)
    }
  }
  return a.meta.animeTitle.localeCompare(b.meta.animeTitle)
}

export const ImportExportedDanmaku = ({
  data,
  open,
  onClose,
}: ImportExportedDanmakuProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  const { mutate: handleUpload, isPending: isUploading } = useMutation({
    mutationFn: async () => {
      if (!data) return

      return chromeRpcClient.danmakuImport(data.succeeded)
    },
    onSuccess: () => {
      toast.success(t('danmakuPage.upload.success'))
      onClose()
      void queryClient.invalidateQueries({
        queryKey: useAllDanmakuQuerySuspense.queryKey(),
      })
    },
    onError: (e) => {
      Logger.debug('Error importing danmaku:', e)
      toast.error(e.message)
    },
  })

  const ddpResults: DDPDanmakuCacheImportDto[] = []
  const ddpIds = new Set<number>()
  const ddpDuplicates = new Set<number>()
  const customResults: CustomDanmakuCacheImportDto[] = []

  data.succeeded?.forEach((result) => {
    if (result.type === DanmakuSourceType.DDP) {
      ddpResults.push(result)
      if (ddpIds.has(result.meta.episodeId)) {
        ddpDuplicates.add(result.meta.episodeId)
      } else {
        ddpIds.add(result.meta.episodeId)
      }
    } else {
      customResults.push(result)
    }
  })

  return (
    <ImportResultDialog
      open={open}
      onClose={onClose}
      onSave={() => handleUpload()}
      disableSave={data.successCount === 0}
      isLoading={isUploading}
    >
      {ddpResults.length > 0 && (
        <>
          <Typography gutterBottom>{t('danmaku.type.DDP')}</Typography>
          {ddpResults
            .toSorted(sortDanmakuCacheImportDto)
            .map((result, index) => {
              const title = `${result.meta.animeTitle} - ${result.meta.episodeTitle} (${result.comments.length})`
              return (
                <DialogContentText key={index} noWrap title={title}>
                  {title}
                </DialogContentText>
              )
            })}
        </>
      )}
      {customResults.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography gutterBottom>{t('danmaku.type.Custom')}</Typography>
          {customResults
            .toSorted(sortDanmakuCacheImportDto)
            .map((result, index) => {
              const title = `${result.meta.animeTitle} - ${result.meta.episodeTitle} (${result.comments.length})`
              return (
                <DialogContentText key={index} noWrap title={title}>
                  {title}
                </DialogContentText>
              )
            })}
        </>
      )}
      {data.errorCount > 0 && (
        <DialogContentText
          sx={{
            color: 'warning.main',
          }}
        >
          {t('danmakuPage.upload.parseError', { count: data.errorCount })}
        </DialogContentText>
      )}
    </ImportResultDialog>
  )
}
