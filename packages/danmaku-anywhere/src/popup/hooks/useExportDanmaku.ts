import { useAllDanmakuQuery } from './useAllDanmakuQuery'

export const useExportDanmaku = () => {
  const query = useAllDanmakuQuery()

  const exportDanmaku = async () => {
    const { data: danmakuList } = await query.refetch()
    const data = new Blob([JSON.stringify(danmakuList)], { type: 'text/json' })
    const url = URL.createObjectURL(data)

    const dateString = new Date().toISOString().split('T')[0]

    const filename = `danmaku-export-${dateString}.json`

    const link = document.createElement('a')
    link.href = url
    link.download = filename

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
