import type { Season } from '@danmaku-anywhere/danmaku-converter'
import type { MatchEpisodeInput, MatchEpisodeResult } from '@/common/anime/dto'
import { Logger } from '@/common/Logger'
import { chromeRpcClient } from '@/common/rpcClient/background/client'

type MatchedEpisode = Extract<MatchEpisodeResult, { status: 'success' }>['data']

export type EpisodeMatch =
  | { status: 'matched'; episode: MatchedEpisode }
  | { status: 'ambiguous'; seasons: Season[] }
  | { status: 'notFound' }
  | { status: 'failed'; error: unknown }

export async function matchEpisode(
  input: MatchEpisodeInput
): Promise<EpisodeMatch> {
  let result: MatchEpisodeResult
  try {
    result = (await chromeRpcClient.episodeMatch(input)).data
  } catch (error) {
    return { status: 'failed', error }
  }
  switch (result.status) {
    case 'success':
      return { status: 'matched', episode: result.data }
    case 'disambiguation':
      return { status: 'ambiguous', seasons: result.data }
    case 'notFound':
      Logger.info(`No episode matched for ${input.title}`, result.cause)
      return { status: 'notFound' }
  }
}
