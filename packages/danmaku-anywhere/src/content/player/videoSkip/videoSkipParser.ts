import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { matchTimeStamp } from '@/content/player/videoSkip/matchTimeStamp'
import { SkipTarget } from '@/content/player/videoSkip/SkipTarget'

export function parseTimestampsFromComment(
  comment: CommentEntity
): SkipTarget | null {
  const [timeStr] = comment.p.split(',')
  const commentTime = Number.parseFloat(timeStr)

  const timestampInfo = matchTimeStamp(comment.m)

  if (timestampInfo) {
    return new SkipTarget({
      commentTime,
      targetTime: timestampInfo.targetTime,
      text: comment.m,
      timestamp: timestampInfo.timestamp,
      shown: false,
    })
  }

  return null
}

function isValidJumpTarget(
  target: SkipTarget,
  maxTimeDifference = 180
): boolean {
  return Math.abs(target.targetTime - target.commentTime) <= maxTimeDifference
}

export function filterOverlappingTargets(
  candidates: SkipTarget[],
  commentTimeBuffer = 5,
  targetTimeBuffer = 5
): SkipTarget[] {
  const sortedCandidates = [...candidates].sort(
    (a, b) => a.commentTime - b.commentTime
  )

  const filteredTargets: SkipTarget[] = []

  for (const candidate of sortedCandidates) {
    const hasOverlap = filteredTargets.some((existing) => {
      return candidate.intersects(existing)
    })

    if (!hasOverlap) {
      filteredTargets.push(candidate)
    }
  }

  return filteredTargets
}

export function parseCommentsForJumpTargets(
  comments: CommentEntity[],
  options: {
    maxTimeDifference?: number
    commentTimeBuffer?: number
    targetTimeBuffer?: number
  } = {}
): SkipTarget[] {
  const {
    maxTimeDifference = 180,
    commentTimeBuffer = 5,
    targetTimeBuffer = 5,
  } = options

  const candidates: SkipTarget[] = []

  for (const comment of comments) {
    const target = parseTimestampsFromComment(comment)
    if (!target) continue
    if (isValidJumpTarget(target, maxTimeDifference)) {
      candidates.push(target)
    }
  }

  return filterOverlappingTargets(
    candidates,
    commentTimeBuffer,
    targetTimeBuffer
  )
}
