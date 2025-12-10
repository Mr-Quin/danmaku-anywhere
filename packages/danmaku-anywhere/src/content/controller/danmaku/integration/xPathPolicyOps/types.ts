export interface MediaInfoParseResult {
  searchTitle: string // The clean title used for searching (e.g., "Show Name S2")
  originalTitle: string // The original full title
  episode: number
  episodeTitle?: string
}

export interface ExtractorMatch {
  value: number | string
  raw: string // The actual substring matched (e.g., "Season 1")
  index: number
  groups?: Record<string, string>
  regex?: string
}
