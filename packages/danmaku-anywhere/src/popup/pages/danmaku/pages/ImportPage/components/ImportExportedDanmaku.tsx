import { DialogContentText, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { DanmakuInsert } from '@/common/danmaku/models/danmaku'
import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import type { ImportParseResult } from '@/common/danmaku/types'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { ImportResultDialog } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportResultDialog'

interface ImportExportedDanmakuProps {
  data: ImportParseResult<DanmakuInsert[]>
  onClose: () => void
  open: boolean
}

const sortDanmakuCacheImportDto = (a: DanmakuInsert, b: DanmakuInsert) => {
  if (a.seasonTitle === b.seasonTitle) {
    // For DDP, sort by episodeId
    if (
      a.provider === DanmakuSourceType.DDP &&
      b.provider === DanmakuSourceType.DDP
    ) {
      if (a.meta.episodeId && b.meta.episodeId) {
        return a.meta.episodeId - b.meta.episodeId
      }
    }
    // Otherwise, sort by episodeTitle
    return a.episodeTitle.localeCompare(b.episodeTitle)
  }
  return a.seasonTitle.localeCompare(b.seasonTitle)
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

  const ddpResults: DanmakuInsert[] = []

  return (
    <ImportResultDialog
      open={open}
      onClose={onClose}
      onSave={() => handleUpload()}
      disableSave={data.successCount === 0}
      isLoading={isUploading}
      errors={data.errors}
    >
      {ddpResults.length > 0 && (
        <>
          <Typography gutterBottom>{t('danmaku.type.DDP')}</Typography>
          {ddpResults
            .toSorted(sortDanmakuCacheImportDto)
            .map((result, index) => {
              const title = `${result.seasonTitle} - ${result.episodeTitle} (${result.comments.length})`
              return (
                <DialogContentText key={index} noWrap title={title}>
                  {title}
                </DialogContentText>
              )
            })}
        </>
      )}
    </ImportResultDialog>
  )
}
