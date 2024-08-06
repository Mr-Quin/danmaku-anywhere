import { useMutation } from '@tanstack/react-query'

import type { CustomDanmakuCreateDto } from '@/common/danmaku/models/danmakuImport/customDanmaku'
import { customDanmakuCreateDtoSchema } from '@/common/danmaku/models/danmakuImport/customDanmaku'
import type { ImportParseResult } from '@/common/danmaku/types'
import type { FileContent } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useUploadDanmaku'

interface UseParseCustomDanmakuProps {
  onSuccess: (data: ImportParseResult<CustomDanmakuCreateDto[]> | null) => void
  onError: (e: Error) => void
}

export const useParseCustomDanmaku = (props: UseParseCustomDanmakuProps) => {
  const { mutate, data } = useMutation({
    mutationFn: async (fileContent: FileContent[]) => {
      const res = await Promise.all(
        fileContent.map(async (fileContent) => {
          // parse each file
          const parseResult = customDanmakuCreateDtoSchema.safeParse(
            fileContent.data
          )

          return parseResult
        })
      )

      const succeeded = res
        .filter((result) => result.success)
        .map((result) => {
          return result.data
        })

      const errorCount = res.reduce((acc, result) => {
        if (result.success) return acc
        return acc + 1
      }, 0)

      return {
        successCount: succeeded.length,
        succeeded,
        errorCount,
      } satisfies ImportParseResult<CustomDanmakuCreateDto[]>
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
