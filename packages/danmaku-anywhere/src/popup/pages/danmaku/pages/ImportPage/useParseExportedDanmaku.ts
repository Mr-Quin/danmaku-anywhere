import { useMutation } from '@tanstack/react-query'

import type { DanmakuCacheImportDto } from '@/common/danmaku/models/danmakuCache/dto'
import { importDanmakuSchema } from '@/common/danmaku/models/danmakuCache/import'
import type { ImportParseResult } from '@/common/danmaku/types'
import { tryCatch } from '@/common/utils/utils'

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
    mutationFn: async () => {
      const [fileHandles, fileErr] = await tryCatch(() =>
        showOpenFilePicker({
          types: [
            {
              description: 'JSON files',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
          multiple: true,
          excludeAcceptAllOption: true,
        })
      )

      // ignore error with no file selected
      if (fileErr) return null

      const res = await Promise.all(
        fileHandles.map(async (fileHandle) => {
          const json = await (await fileHandle.getFile()).text()

          // parse each file
          const parseResult = importDanmakuSchema.safeParse(JSON.parse(json))

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
