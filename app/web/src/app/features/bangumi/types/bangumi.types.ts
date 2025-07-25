import type { components } from '@danmaku-anywhere/bangumi-api/next'

export type BgmTrendingSubject = components['schemas']['TrendingSubject']
export type BgmSlimSubject = components['schemas']['SlimSubject']
export type BgmSubject = components['schemas']['Subject']
export type BgmCalendar = components['schemas']['Calendar'][string][]
export type BgmSubjectComment = components['schemas']['SubjectInterestComment']
export type BgmTopic = components['schemas']['Topic']
export type BgmSubjectReview = components['schemas']['SubjectReview']

export type BgmTrendingQueryResponse = {
  data: BgmTrendingSubject[]
  total: number
}

export type BgmGetSubjectCommentResponse = {
  data: BgmSubjectComment[]
  total: number
}
export type BgmGetSubjectReviewResponse = {
  data: BgmSubjectReview[]
  total: number
}
export type BgmGetTopicResponse = { data: BgmTopic[]; total: number }
