import { combinedDanmakuSchema } from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'

import { DanmakuSourceType } from '@/common/danmaku/enums'
import type { ImportParseResult } from '@/common/danmaku/types'
import { CustomEpisodeInsertV4 } from '@/common/danmaku/types/v4/schema'
import type { FileContent } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useUploadDanmaku'

interface UseParseCustomDanmakuProps {
  onSuccess: (data: ImportParseResult<CustomEpisodeInsertV4[]> | null) => void
  onError: (e: Error) => void
}

export const useParseCustomDanmaku = (props: UseParseCustomDanmakuProps) => {
  const { mutate, data } = useMutation({
    mutationFn: async (fileContent: FileContent[]) => {
      const res = await Promise.all(
        fileContent.map(async (fileContent) => {
          // parse each file
          const parseResult = combinedDanmakuSchema.safeParse(fileContent.data)

          return { ...parseResult, file: fileContent.file }
        })
      )

      const succeeded = res
        .filter((result) => result.success)
        .map((result) => {
          const fileName = result.file.split('.')[0]

          return {
            comments: result.data.comments,
            title: fileName,
            provider: DanmakuSourceType.Custom,
            commentCount: result.data.comments.length,
          } satisfies CustomEpisodeInsertV4
        })

      const errors = res
        .filter((result) => !result.success)
        .map((result) => {
          return result.error
        })

      return {
        successCount: succeeded.length,
        succeeded,
        errorCount: errors.length,
        errors,
      } satisfies ImportParseResult<CustomEpisodeInsertV4[]>
    },
    onError: (e) => {
      props.onError(e)
    },
    onSuccess: (data) => {
      props.onSuccess(data)
    },
  })

  return {
    parse: mutate,
    data,
  }
}
