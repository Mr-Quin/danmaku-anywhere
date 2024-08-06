import { useMutation } from '@tanstack/react-query'

import type { DanmakuCacheImportDto } from '@/common/danmaku/models/danmakuCache/dto'
import { importDanmakuSchema } from '@/common/danmaku/models/danmakuCache/import'
import type { ImportParseResult } from '@/common/danmaku/types'
import type { FileContent } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useUploadDanmaku'

// IMPORTANT: A type error with ImportedCache means the schema does not match the expected data structure
type ImportedCache = ImportParseResult<DanmakuCacheImportDto[]>

interface UseParseExportedDanmakuProps {
  onSuccess: (data: ImportedCache | null) => void
  onError: (e: Error) => void
}

export const useParseExportedDanmaku = (
  props: UseParseExportedDanmakuProps
) => {
  const { mutate, data } = useMutation({
    mutationFn: async (fileContent: FileContent[]) => {
      const res = await Promise.all(
        fileContent.map(async (fileContent) => {
          // parse each file
          const parseResult = importDanmakuSchema.safeParse(fileContent.data)

          return parseResult
        })
      )

      const succeeded = res
        .filter((result) => result.success)
        .map((result) => {
          return result.data
        })
        .flat()

      const errorCount = res.reduce((acc, result) => {
        if (result.success) return acc
        return acc + 1
      }, 0)

      return {
        successCount: succeeded.length,
        succeeded,
        errorCount,
      } satisfies ImportedCache
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
