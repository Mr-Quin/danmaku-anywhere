import { DialogContentText, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import { Logger } from '@/common/Logger'
import { useToast } from '@/common/components/Toast/toastStore'
import {
  DanmakuSourceType,
  localizedDanmakuSourceType,
} from '@/common/danmaku/enums'
import type { ImportParseResult } from '@/common/danmaku/types'
import { EpisodeInsertV4, WithSeason } from '@/common/danmaku/types/v4/schema'
import { danmakuQueryKeys } from '@/common/queries/queryKeys'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { ImportResultDialog } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportResultDialog'

interface ImportExportedDanmakuProps {
  data: ImportParseResult<WithSeason<EpisodeInsertV4>[]>
  onClose: () => void
  open: boolean
}

const sortDanmakuCacheImportDto = (
  a: WithSeason<EpisodeInsertV4>,
  b: WithSeason<EpisodeInsertV4>
) => {
  if (a.season.title === b.season.title) {
    // For DDP, sort by episodeId
    if (
      a.provider === DanmakuSourceType.DanDanPlay &&
      b.provider === DanmakuSourceType.DanDanPlay
    ) {
      if (a.providerIds.episodeId && b.providerIds.episodeId) {
        return a.providerIds.episodeId - b.providerIds.episodeId
      }
    }
    // Otherwise, sort by episodeTitle
    return a.title.localeCompare(b.title)
  }
  return a.season.title.localeCompare(b.season.title)
}

export const ImportExportedDanmaku = ({
  data,
  open,
  onClose,
}: ImportExportedDanmakuProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const { mutate: handleUpload, isPending: isUploading } = useMutation({
    mutationKey: danmakuQueryKeys.all(),
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
                const title = `${result.season.title} - ${result.title} (${result.comments.length})`
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
