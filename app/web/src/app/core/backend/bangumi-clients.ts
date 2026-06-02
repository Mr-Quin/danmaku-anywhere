import { InjectionToken } from '@angular/core'
import type { paths as BgmPaths } from '@danmaku-anywhere/bangumi-api'
import type { paths as BgmNextPaths } from '@danmaku-anywhere/bangumi-api/next'
import type createClient from 'openapi-fetch'

export type BangumiClient = ReturnType<typeof createClient<BgmPaths>>
export type BangumiNextClient = ReturnType<typeof createClient<BgmNextPaths>>

export const BANGUMI_CLIENT = new InjectionToken<BangumiClient>(
  'BANGUMI_CLIENT'
)
export const BANGUMI_NEXT_CLIENT = new InjectionToken<BangumiNextClient>(
  'BANGUMI_NEXT_CLIENT'
)
