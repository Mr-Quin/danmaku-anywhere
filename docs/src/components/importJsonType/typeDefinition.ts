interface CustomComment {
  mode?: 'ltr' | 'rtl' | 'top' | 'bottom' // default 'ltr'
  time: number // the time in seconds the comment should appear
  color: string // hex color code
  text: string // the comment text
}

interface CustomDanmaku {
  comments: CustomComment[] // at least one comment is required
  animeTitle: string
  // One of the following is required
  episodeTitle?: string
  episodeNumber?: number
}

type CustomDanmakuList = CustomDanmaku[]
