export interface MediaInfoParseResult {
  // Title which is used for searching and identification
  searchTitle: string
  // The original full title as it was found
  originalTitle: string
  episode?: number
  episodeTitle?: string
}

export interface ExtractorMatch {
  value: number | string
  // The actual substring matched
  raw: string
  index: number
  groups?: Record<string, string>
  regex?: string
}
