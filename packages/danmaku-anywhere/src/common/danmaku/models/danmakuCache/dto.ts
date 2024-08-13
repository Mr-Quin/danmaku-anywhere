export interface CustomDanmakuCreateData {
  comments: {
    p: string
    m: string
  }[]
  animeTitle: string
  episodeTitle?: string
  episodeNumber?: number
}
