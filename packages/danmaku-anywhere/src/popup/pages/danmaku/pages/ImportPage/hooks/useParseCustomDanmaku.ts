import { combinedDanmakuSchema } from '@danmaku-anywhere/danmaku-converter'
import { useMutation } from '@tanstack/react-query'

import type { CustomDanmakuCreateData } from '@/common/danmaku/models/danmakuCache/dto'
import type { ImportParseResult } from '@/common/danmaku/types'
import type { FileContent } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useUploadDanmaku'

interface UseParseCustomDanmakuProps {
  onSuccess: (data: ImportParseResult<CustomDanmakuCreateData[]> | null) => void
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
          if ('animeTitle' in result.data) {
            // custom danmaku, return as is
            return result.data
          }

          const fileName = result.file.split('.')[0]

          // TODO: refactor
          // use file name as animeTitle
          return {
            ...result.data,
            animeTitle: fileName,
            episodeNumber: 1,
          }
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
      } satisfies ImportParseResult<CustomDanmakuCreateData[]>
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
