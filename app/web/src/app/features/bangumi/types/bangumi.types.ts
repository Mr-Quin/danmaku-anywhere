import type { components as nextComponents } from '../../../bangumi-api/schema-next'

export type BgmTrendingSubject = nextComponents['schemas']['TrendingSubject']
export type BgmSlimSubject = nextComponents['schemas']['SlimSubject']
export type BgmSubject = nextComponents['schemas']['Subject']
export type BgmCalendar = nextComponents['schemas']['Calendar'][string][]
export type BgmSubjectComment =
  nextComponents['schemas']['SubjectInterestComment']
export type BgmTopic = nextComponents['schemas']['Topic']
export type BgmSubjectReview = nextComponents['schemas']['SubjectReview']

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
