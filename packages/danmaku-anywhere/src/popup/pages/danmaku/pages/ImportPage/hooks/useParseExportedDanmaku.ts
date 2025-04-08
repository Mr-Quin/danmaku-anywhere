import { useMutation } from '@tanstack/react-query'

import { importDanmakuSchema } from '@/common/danmaku/import/import'
import type { ImportParseResult } from '@/common/danmaku/types'
import { EpisodeInsertV4, WithSeason } from '@/common/danmaku/types/v4/schema'
import type { FileContent } from '@/popup/pages/danmaku/pages/ImportPage/hooks/useUploadDanmaku'

// IMPORTANT: A type error with ImportedCache means the schema does not match the expected data structure
type ImportedCache = ImportParseResult<WithSeason<EpisodeInsertV4>[]>

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

      const errors = res
        .filter((result) => !result.success)
        .map((result) => {
          return result.error
        })

      return {
        successCount: succeeded.length,
        succeeded,
        errors,
        errorCount: errors.length,
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
