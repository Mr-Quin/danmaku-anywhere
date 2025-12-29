export * from './DanmakuRenderer'
export { mapIter, sampleByTime, sampleFromBucket } from './iterator'
export * from './options'
export * from './parser'
export { bindVideo } from './plugins/bindVideo'
export { useFixedDanmaku } from './plugins/fixedDanmaku'

import { DanmakuRenderer } from './DanmakuRenderer'

export default DanmakuRenderer
