import { useAllDanmakuQuery } from './useAllDanmakuQuery'

import { createDownload } from '@/common/utils'

export const useExportDanmaku = () => {
  const query = useAllDanmakuQuery()

  const exportDanmaku = async () => {
    const { data: danmakuList } = await query.refetch()

    await createDownload(
      new Blob([JSON.stringify(danmakuList)], { type: 'text/json' })
    )
  }

  return { ...query, exportDanmaku }
}
