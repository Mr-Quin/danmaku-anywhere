export const PATTERNS = {
  SEASON: [
    /(?:^|\s|[\[(])S(\d+)(?:$|\s|[\])])/i, // S1
    /(?:^|\s)Season\s*(\d+)(?:$|\s)/i, // Season 1
    /第\s*(\d+|[零一二三四五六七八九十百]+)\s*季/, // Chinese
  ],
  EPISODE: [
    /(?:^|\s|[\[(])E(\d+)(?:$|\s|[\])])/i, // E1
    /(?:^|\s)Ep(?:isode)?\.?\s+(\d+)(?:$|\s)/i, // Episode 1
    /第\s*(\d+|[零一二三四五六七八九十百]+)\s*[集话]/, // Chinese
    // The "Combined" heuristic: If we see S1E1, we capture E1 here
    /S\d+E(\d+)/i,
  ],
}
