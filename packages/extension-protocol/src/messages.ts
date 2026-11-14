import type {
  CommentEntity,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import type { KazumiPolicy } from './kazumi.js'
import type { HTTPHeader, MediaInfo } from './payloads.js'

export const DA_EXT_SOURCE_CONTENT = 'content-script'
export const DA_EXT_SOURCE_APP = 'app'

export type ExtMessageSource =
  | typeof DA_EXT_SOURCE_CONTENT
  | typeof DA_EXT_SOURCE_APP

export type ExtActionType = keyof ExtAction

export type ExtActionDef<TIn, TOut> = {
  input: TIn
  output: TOut
}

export type ExtAction = {
  kazumiSearch: ExtActionDef<
    {
      keyword: string
      policy: KazumiPolicy
    },
    {
      name: string
      url: string
    }[]
  >
  kazumiGetChapters: ExtActionDef<
    {
      url: string
      policy: KazumiPolicy
    },
    {
      name: string
      url: string
    }[][]
  >
  extractMedia: ExtActionDef<
    {
      url: string
    },
    MediaInfo
  >
  episodeGetAll: ExtActionDef<void, GenericEpisodeLite[]>
  danmakuGet: ExtActionDef<GenericEpisodeLite, CommentEntity[]>
  setRequestHeaders: ExtActionDef<SetHeaderRule, void>
}

type ExtRequestBase<T extends ExtActionType> = {
  id: string
  type: 'request'
  action: T
  data: ExtAction[T]['input']
  source: ExtMessageSource
}

// mapped type to create discriminated union
type ExtRequestMap = {
  [K in ExtActionType]: ExtRequestBase<K>
}

export type ExtRequest = ExtRequestMap[ExtActionType]

export type ExtResponseSuccess<T extends ExtActionType = ExtActionType> = {
  id: string
  type: 'response'
  action: T
  success: true
  source: ExtMessageSource
  isLast: boolean
  data: ExtAction[T]['output']
}

export type ExtResponseError = {
  id: string
  type: 'response'
  action: ExtActionType
  success: false
  source: ExtMessageSource
  isLast: true
  err: string
}

export type ExtResponse<T extends ExtActionType = ExtActionType> =
  | ExtResponseSuccess<T>
  | ExtResponseError

export type ExtMessage = ExtRequest | ExtResponse

export const createExtRequest = <T extends ExtActionType>(req: {
  id: string
  action: T
  data: ExtAction[T]['input']
  source: ExtMessageSource
}): ExtRequestBase<T> => {
  return {
    ...req,
    type: 'request',
  }
}

export const createExtResponse = <T extends ExtActionType>(
  req: Omit<ExtResponseSuccess<T>, 'type'> | Omit<ExtResponseError, 'type'>
): ExtResponse<T> => {
  return {
    type: 'response',
    ...req,
  }
}

export type SetHeaderRule = {
  headers?: HTTPHeader[]
  url: string
  referer: string
  // rewrites request Origin to this and forces Access-Control-Allow-Origin: *,
  // so a CDN that only allowlists the source origin serves the CORS request
  origin?: string
}
