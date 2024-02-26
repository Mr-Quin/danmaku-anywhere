export interface DanmakuFetchOptions {
  forceUpdate?: boolean // force update danmaku from server even if it's already in db
  cacheOnly?: boolean // only fetch from cache, prevent making request to server
}
