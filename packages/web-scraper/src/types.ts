import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import type { MediaInfo } from './extractMedia.js'

export interface KazumiSearchResult {
  name: string
  url: string
}

export interface KazumiChapterResult {
  name: string
  url: string
}

export interface ExtractMediaResult {
  media: MediaInfo[]
}

export type KazumiSearchPayload = {
  keyword: string
  policy: KazumiPolicy
}

export type KazumiChapterPayload = {
  url: string
  policy: KazumiPolicy
}

export type ExtractMediaPayload = {
  url: string
}

export type HTTPHeader = { name: string; value?: string }
