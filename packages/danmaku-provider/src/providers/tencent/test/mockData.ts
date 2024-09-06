import barrage600000 from './barrage-60000.json'
import barrageBase from './barrage-base.json'
import episodeList from './episodeList.json'
import episodeListLast from './episodeListLast.json'
import search from './search.json'

/**
 * POST https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.HttpMobileRecall/MbSearchHttp
 * {
 *     "version": "",
 *     "filterValue": "firstTabid=150",
 *     "retry": 0,
 *     "query": "斗罗大陆",
 *     "pagesize": 20,
 *     "pagenum": 0,
 *     "queryFrom": 4,
 *     "isneedQc": true,
 *     "adRequestInfo": "",
 *     "sdkRequestInfo": "",
 *     "sceneId": 21,
 *     "platform": "23"
 * }
 */
export const mockSearchMediaResponse = search

/**
 * POST https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2
 * {
 *     "pageParams": {
 *         "cid": "2xslevs0grk9vy0",
 *         "lid": "0",
 *         "req_from": "web_mobile",
 *         "page_type": "detail_operation",
 *         "page_id": "vsite_episode_list",
 *         "id_type": "1",
 *         "page_size": "100",
 *         "page_context": ""
 *     },
 *     "has_cache": 1
 * }
 */
export const mockEpisodeListResponse = episodeList
export const mockEpisodeListLastResponse = episodeListLast

/**
 * GET https://dm.video.qq.com/barrage/base/m00253deqqo
 */
export const mockBarrageBaseResponse = barrageBase

/**
 * GET https://dm.video.qq.com/barrage/segment/m00253deqqo/t/v1/0/60000
 */
export const mockBarrage600000Response = barrage600000
