import { z } from 'zod'
import { zXmlParsedJson } from './genericXml'
import { zWevipDanmaku } from './weVip'

export * from './genericXml'

export const zCombinedDanmaku = z.union([zXmlParsedJson, zWevipDanmaku])
