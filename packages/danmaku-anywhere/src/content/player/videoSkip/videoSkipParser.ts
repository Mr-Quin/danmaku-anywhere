import type { CommentEntity } from '@danmaku-anywhere/danmaku-converter'
import { matchTimeStamp } from '@/content/player/videoSkip/matchTimeStamp'
import { SkipTarget } from '@/content/player/videoSkip/SkipTarget'

function parseTimestampsFromComment(comment: CommentEntity): SkipTarget | null {
  const timestampInfo = matchTimeStamp(comment.m)

  if (timestampInfo) {
    const [timeStr] = comment.p.split(',')
    const commentTime = Number.parseFloat(timeStr)

    return new SkipTarget({
      startTime: commentTime,
      endTime: timestampInfo.targetTime,
    })
  }

  return null
}

function mergeOverlappingTargets(candidates: SkipTarget[]): SkipTarget[] {
  if (candidates.length === 0) return []

  const normalizedStart = (t: SkipTarget) => Math.min(t.startTime, t.endTime)
  const sorted = candidates
    .slice()
    .sort((a, b) => normalizedStart(a) - normalizedStart(b))

  const result: SkipTarget[] = []
  let current = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (current.intersects(next)) {
      current.mergeWith(next)
    } else {
      result.push(current)
      current = next
    }
  }

  result.push(current)
  return result.sort((a, b) => a.startTime - b.startTime)
}

export function parseCommentsForJumpTargets(
  comments: CommentEntity[],
  options?: { maxTimeDifference?: number }
): SkipTarget[] {
  const candidates: SkipTarget[] = []
  const MAX_TIME_DIFFERENCE_SECONDS = options?.maxTimeDifference ?? 300

  for (const comment of comments) {
    const target = parseTimestampsFromComment(comment)
    if (!target) {
      continue
    }
    const timeDifference = Math.abs(target.endTime - target.startTime)
    if (timeDifference <= MAX_TIME_DIFFERENCE_SECONDS) {
      candidates.push(target)
    }
  }

  return mergeOverlappingTargets(candidates)
}
