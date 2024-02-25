import { useQuery } from '@tanstack/react-query'

import { danmakuMessage } from '@/common/messages/danmakuMessage'

export const useExportDanmaku = () => {
  const query = useQuery({
    queryKey: ['danmakuCache', 'getAll'],
    queryFn: async () => {
      const res = await danmakuMessage.getAll({})
      if (!res) throw new Error('Failed to get danmaku from cache')
      return res
    },
    enabled: false,
  })

  const exportDanmaku = async () => {
    const { data: danmakuList } = await query.refetch()
    const data = new Blob([JSON.stringify(danmakuList)], { type: 'text/json' })
    const url = URL.createObjectURL(data)

    const dateString = new Date().toISOString().split('T')[0]

    const filename = `danmaku-export-${dateString}.json`

    // Create a hidden anchor tag
    const link = document.createElement('a')
    link.href = url
    link.download = filename

    // Append to the document for the download to work
    document.body.appendChild(link)

    link.click()

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        resolve()
      }, 100)
    })
  }

  return { ...query, exportDanmaku }
}
