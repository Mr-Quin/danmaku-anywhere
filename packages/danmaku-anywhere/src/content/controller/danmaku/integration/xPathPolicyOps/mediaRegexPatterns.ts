export const PATTERNS = {
  // season patterns intentionally captures the whole string rather than the numeric part
  // this is because season is used in the search key, so it should be the same as the original title
  SEASON: [
    /(?:^|\s|[\[(])(S\d+)(?:$|\s|[\])])/i, // S1
    /(?:^|\s)(Season\s*\d+)(?:$|\s)/i, // Season 1
    /(第\s*(?:\d+|[零一二三四五六七八九十百]+)\s*季)/, // Chinese
  ],
  EPISODE: [
    /(?:^|\s|[\[(])E(\d+)(?:$|\s|[\])])/i, // E1
    /(?:^|\s)Ep(?:isode)?\.?\s+(\d+)(?:$|\s)/i, // Episode 1
    /第\s*(\d+|[零一二三四五六七八九十百]+)\s*[集话]/, // Chinese
    /(?<=S\d+)E(\d+)/i, // S_E_, but only matches the E part
  ],
}
