export type ParsedPlayUrl = {
  source: string
  seasonTitle: string
  title: string
  originalTitle: string
  url: string
}

export const parsePlayUrl = (
  seasonTitle: string,
  playFrom: string,
  playUrl: string
) => {
  const playFromList = playFrom.split('$$$')
  const blocks = playUrl.split('$$$').filter(Boolean)

  const parsedPlayUrls: ParsedPlayUrl[] = []

  blocks.forEach((block, i) => {
    const source = playFromList[i] ?? `source_${i}`
    const entries = block.split('#').filter(Boolean)
    entries.forEach((entry) => {
      const [title, url] = entry.split('$')

      if (!url) return

      parsedPlayUrls.push({
        seasonTitle,
        source,
        url,
        originalTitle: title,
        title: `${seasonTitle} - ${source} - ${title}`,
      })
    })
  })

  return parsedPlayUrls
}
