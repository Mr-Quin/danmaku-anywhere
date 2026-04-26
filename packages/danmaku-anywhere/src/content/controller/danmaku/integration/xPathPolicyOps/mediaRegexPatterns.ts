// Includes simplified, traditional, and formal (大写数字) variants — keep in sync with `chineseToNumber.ts`
const CN_NUMERAL_CLASS =
  '[零一二三四五六七八九十百千万萬两兩壹贰貳叁參弎肆伍陆陸柒捌玖拾佰仟]'

export const PATTERNS = {
  // season patterns intentionally captures the whole string rather than the numeric part
  // this is because season is used in the search key, so it should be the same as the original title
  SEASON: [
    /(?:^|\s|[\[(])(S\d+)(?:$|\s|[\])])/i, // S1
    /(?:^|\s)(Season\s*\d+)(?:$|\s)/i, // Season 1
    new RegExp(`(第\\s*(?:\\d+|${CN_NUMERAL_CLASS}+)\\s*季)`), // Chinese
  ],
  EPISODE: [
    /(?:^|\s|[\[(])E(\d+)(?:$|\s|[\])])/i, // E1
    /(?:^|\s)Ep(?:isode)?\.?\s+(\d+)(?:$|\s)/i, // Episode 1
    new RegExp(`第\\s*(\\d+|${CN_NUMERAL_CLASS}+)\\s*[集话]`), // Chinese
    /(?<=S\d+)E(\d+)/i, // S_E_, but only matches the E part
  ],
}
