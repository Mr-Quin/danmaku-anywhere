import { DialogContentText } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/common/components/Toast/toastStore'
import type { CustomDanmakuCreateDto } from '@/common/danmaku/models/danmakuImport/customDanmaku'
import { useAllDanmakuQuerySuspense } from '@/common/danmaku/queries/useAllDanmakuQuerySuspense'
import type { ImportParseResult } from '@/common/danmaku/types'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'
import { ImportResultDialog } from '@/popup/pages/danmaku/pages/ImportPage/components/ImportResultDialog'

interface CustomDanmakuImportResultProps {
  data: ImportParseResult<CustomDanmakuCreateDto[]>
  onClose: () => void
  open: boolean
}

export const ImportCustomDanmaku = ({
  data,
  open,
  onClose,
}: CustomDanmakuImportResultProps) => {
  const { t } = useTranslation()
  const toast = useToast.use.toast()

  const queryClient = useQueryClient()

  const { mutate: handleUpload, isPending: isUploading } = useMutation({
    mutationFn: async () => {
      if (!data) return

      return chromeRpcClient.danmakuCreateCustom(data.succeeded)
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

  return (
    <ImportResultDialog
      open={open}
      onClose={onClose}
      onSave={() => handleUpload()}
      disableSave={data.successCount === 0}
      isLoading={isUploading}
      errors={data.errors}
    >
      {data.successCount > 0 && (
        <>
          <DialogContentText>
            {t('danmakuPage.upload.parsedEntries')}
          </DialogContentText>
          {data.succeeded?.map((result, index) => {
            return (
              <DialogContentText key={index}>
                {result.animeTitle} -{' '}
                {result.episodeTitle ?? result.episodeNumber} (
                {result.comments.length})
              </DialogContentText>
            )
          })}
        </>
      )}
    </ImportResultDialog>
  )
}
