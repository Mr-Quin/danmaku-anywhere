import { DialogContentText, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import type { DanmakuInsert } from '@/common/danmaku/models/danmaku'
import { danmakuKeys } from '@/common/danmaku/queries/danmakuQueryKeys'
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
      a.provider === DanmakuSourceType.DanDanPlay &&
      b.provider === DanmakuSourceType.DanDanPlay
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

  const { mutate: handleUpload, isPending: isUploading } = useMutation({
    mutationKey: danmakuKeys.all(),
    mutationFn: async () => {
      if (!data) return

      return chromeRpcClient.danmakuImport(data.succeeded)
    },
    onSuccess: () => {
      toast.success(t('danmakuPage.upload.success'))
      onClose()
    },
    onError: (e) => {
      Logger.debug('Error importing danmaku:', e)
      toast.error(e.message)
    },
    meta: {
      invalidateOnError: true,
    },
  })

  const resultGroups = Object.groupBy(data.succeeded, (d) =>
    localizedDanmakuSourceType(d.provider)
  )

  return (
    <ImportResultDialog
      open={open}
      onClose={onClose}
      onSave={() => handleUpload()}
      disableSave={data.successCount === 0}
      isLoading={isUploading}
      errors={data.errors}
    >
      {Object.keys(resultGroups).map((provider) => {
        if (!resultGroups[provider]?.length) return null

        return (
          <Fragment key={provider}>
            <Typography key={provider} gutterBottom>
              {t(provider)} ({resultGroups[provider].length})
            </Typography>
            {resultGroups[provider]
              .toSorted(sortDanmakuCacheImportDto)
              .map((result, index) => {
                const title = `${result.seasonTitle} - ${result.episodeTitle} (${result.comments.length})`
                return (
                  <DialogContentText key={index} noWrap title={title}>
                    {title}
                  </DialogContentText>
                )
              })}
          </Fragment>
        )
      })}
    </ImportResultDialog>
  )
}
