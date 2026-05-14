import { z } from 'zod'
import { zCommentImport } from '../canonical/comment/types.js'
import { zXmlParsedJson } from './genericXml.js'
import { zWevipDanmaku } from './weVip.js'

export * from './genericXml.js'

export const zCombinedDanmaku = z.union([
  zXmlParsedJson,
  zWevipDanmaku,
  z.array(zCommentImport),
])
