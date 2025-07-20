import type {
  CommentEntity,
  GenericEpisodeLite,
} from '@danmaku-anywhere/danmaku-converter'
import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import type { MediaInfo } from '../extractMedia.js'
import type { HTTPHeader } from '../types.js'

const DA_EXT_ATTR = 'da-ext-version'

export const setExtensionAttr = (version: string) => {
  document.documentElement.setAttribute(DA_EXT_ATTR, version)
}

export const getExtensionAttr = () => {
  return document.documentElement.getAttribute('da-ext-version')
}

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
}

export const setRequestHeaderRule = async (headerRule: SetHeaderRule) => {
  const existingRules = await chrome.declarativeNetRequest.getSessionRules()

  // check if url exists, if it does, remove the rule
  const prevRule = existingRules.find((rule) => {
    return rule.condition.urlFilter?.includes(headerRule.url)
  })

  const lastRule = existingRules.sort((a, b) => a.id - b.id).at(-1)

  const lastId = lastRule?.id ?? 1

  // @ts-expect-error
  // biome-ignore lint/correctness/noUndeclaredVariables: browser is defined in firefox
  const isChrome = typeof browser === 'undefined'

  const resourceTypes: (
    | 'object'
    | 'main_frame'
    | 'sub_frame'
    | 'stylesheet'
    | 'xmlhttprequest'
    | 'csp_report'
    | 'font'
    | 'image'
    | 'ping'
    | 'script'
    | 'media'
    | 'websocket'
    | 'webbundle'
    | 'other'
    | 'webtransport'
  )[] = [
    'main_frame',
    'sub_frame',
    'stylesheet',
    'xmlhttprequest',
    'csp_report',
    'font',
    'image',
    'ping',
    'script',
    'object',
    'media',
    'websocket',
    'other',
  ]

  if (isChrome) {
    // not supported in Firefox
    resourceTypes.push('webtransport')
    resourceTypes.push('webbundle')
  }

  const headersToSet =
    headerRule.headers?.map(
      (h): chrome.declarativeNetRequest.ModifyHeaderInfo => {
        return {
          header: h.name,
          operation: 'set',
          value: h.value!,
        }
      }
    ) ?? []

  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id: lastId + 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            ...headersToSet,
            {
              header: 'Referer',
              operation: 'set',
              value: headerRule.referer,
            },
          ],
        },
        condition: {
          urlFilter: `|${headerRule.url}`,
          resourceTypes: resourceTypes,
        },
      },
    ],
    removeRuleIds: prevRule ? [prevRule.id] : [],
  })
}
