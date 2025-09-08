import { Injectable } from '@angular/core'
import {
  infiniteQueryOptions,
  queryOptions,
} from '@tanstack/angular-query-experimental'
import { queryClient } from '../../../shared/query/queryClient'
import { queryKeys } from '../../../shared/query/queryKeys'
import type {
  BgmCalendar,
  BgmGetSubjectCommentResponse,
  BgmGetSubjectReviewResponse,
  BgmGetTopicResponse,
  BgmSubject,
  BgmSubjectSearchFilterModel,
  BgmSubjectSearchSorting,
  BgmTrendingQueryResponse,
  LegacyBgmSubjectResponse,
} from '../types/bangumi.types'
import { bangumiClient } from './bangumiClient'
import { bangumiNextClient } from './bangumiNextClient'

@Injectable({
  providedIn: 'root',
})
export class BangumiService {
  getCalendarQueryOptions = () =>
    queryOptions({
      queryKey: queryKeys.bangumi.calendar(),
      queryFn: async (): Promise<BgmCalendar> => {
        const res = await bangumiNextClient.GET('/p1/calendar')
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        const weeks = Object.values(res.data!)
        return weeks.map((day) => {
          return day.filter(
            (item) => item.subject.type === 2 && item.subject.nameCN !== ''
          )
        })
      },
    })

  getTrendingInfiniteQueryOptions = () =>
    infiniteQueryOptions({
      queryKey: queryKeys.bangumi.trendingInfinite(),
      queryFn: async ({ pageParam = 0 }): Promise<BgmTrendingQueryResponse> => {
        const limit = 20
        const offset = pageParam * limit
        const res = await bangumiNextClient.GET('/p1/trending/subjects', {
          params: {
            query: {
              type: 2,
              limit,
              offset,
            },
          },
        })
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      initialPageParam: 0,
      getNextPageParam: (
        lastPage: BgmTrendingQueryResponse,
        allPages: BgmTrendingQueryResponse[]
      ) => {
        let totalSize = 0
        for (const page of allPages) {
          for (const _ of page.data) {
            totalSize += 1
          }
        }
        // return the offset if there are pages remaining
        return totalSize < lastPage.total ? allPages.length : undefined
      },
    })

  getSubjectDetailsQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.details(subjectId),
      queryFn: async (): Promise<BgmSubject> => {
        const res = await bangumiNextClient.GET('/p1/subjects/{subjectID}', {
          params: {
            path: {
              subjectID: subjectId,
            },
          },
        })
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectEpisodesQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.episodes(subjectId),
      queryFn: async () => {
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/episodes',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectCharactersQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.characters(subjectId),
      queryFn: async () => {
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/characters',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectRelationsQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.relations(subjectId),
      queryFn: async () => {
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/relations',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectStaffPersonsQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.staffPersons(subjectId),
      queryFn: async () => {
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/staffs/persons',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectRecsQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.recommendations(subjectId),
      queryFn: async () => {
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/recs',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectReviewsQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.reviews(subjectId),
      queryFn: async () => {
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/reviews',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectTopicsQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.topics(subjectId),
      queryFn: async () => {
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/topics',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectTopicsInfiniteQueryOptions = (subjectId: number) =>
    infiniteQueryOptions({
      queryKey: queryKeys.bangumi.subject.topicsInfinite(subjectId),
      queryFn: async ({ pageParam = 0 }): Promise<BgmGetTopicResponse> => {
        const limit = 20
        const offset = pageParam * limit
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/topics',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
              query: {
                limit,
                offset,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      initialPageParam: 0,
      getNextPageParam: (
        lastPage: BgmGetTopicResponse,
        allPages: BgmGetTopicResponse[]
      ) => {
        let totalSize = 0
        for (const page of allPages) {
          totalSize += page.data.length
        }
        // return the offset if there are pages remaining
        return totalSize < lastPage.total ? allPages.length : undefined
      },
      enabled: !!subjectId,
    })

  getSubjectReviewsInfiniteQueryOptions = (subjectId: number) =>
    infiniteQueryOptions({
      queryKey: queryKeys.bangumi.subject.reviewsInfinite(subjectId),
      queryFn: async ({
        pageParam = 0,
      }): Promise<BgmGetSubjectReviewResponse> => {
        const limit = 20
        const offset = pageParam * limit
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/reviews',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
              query: {
                limit,
                offset,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      initialPageParam: 0,
      getNextPageParam: (
        lastPage: BgmGetSubjectReviewResponse,
        allPages: BgmGetSubjectReviewResponse[]
      ) => {
        let totalSize = 0
        for (const page of allPages) {
          totalSize += page.data.length
        }
        // return the offset if there are pages remaining
        return totalSize < lastPage.total ? allPages.length : undefined
      },
      enabled: !!subjectId,
    })

  getSubjectCommentsQueryOptions = (subjectId: number) =>
    queryOptions({
      queryKey: queryKeys.bangumi.subject.comments(subjectId),
      queryFn: async () => {
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/comments',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      enabled: !!subjectId,
    })

  getSubjectCommentsInfiniteQueryOptions = (subjectId: number) =>
    infiniteQueryOptions({
      queryKey: queryKeys.bangumi.subject.commentsInfinite(subjectId),
      queryFn: async ({
        pageParam = 0,
      }): Promise<BgmGetSubjectCommentResponse> => {
        const limit = 20
        const offset = pageParam * limit
        const res = await bangumiNextClient.GET(
          '/p1/subjects/{subjectID}/comments',
          {
            params: {
              path: {
                subjectID: subjectId,
              },
              query: {
                limit,
                offset,
              },
            },
          }
        )
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      initialPageParam: 0,
      getNextPageParam: (
        lastPage: BgmGetSubjectCommentResponse,
        allPages: BgmGetSubjectCommentResponse[]
      ) => {
        let totalSize = 0
        for (const page of allPages) {
          totalSize += page.data.length
        }
        // return the offset if there are pages remaining
        return totalSize < lastPage.total ? allPages.length : undefined
      },
      enabled: !!subjectId,
    })

  searchSubjectsQueryOptions = (
    searchString: string,
    sort?: BgmSubjectSearchSorting,
    filter?: BgmSubjectSearchFilterModel
  ) =>
    infiniteQueryOptions({
      queryKey: queryKeys.bangumi.search.subjects(searchString, sort, filter),
      queryFn: async ({ pageParam = 0 }): Promise<LegacyBgmSubjectResponse> => {
        const limit = 10
        const offset = pageParam

        const res = await bangumiClient.POST('/v0/search/subjects', {
          body: {
            keyword: searchString,
            filter,
            sort,
          },
          params: {
            query: {
              limit,
              offset,
            },
          },
        })
        // biome-ignore lint/style/noNonNullAssertion: checked in middleware
        return res.data!
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage: LegacyBgmSubjectResponse) => {
        if (lastPage.data.length < lastPage.limit) {
          return undefined
        }
        return lastPage.offset + lastPage.limit
      },
      enabled: !!searchString && searchString.trim() !== '',
    })

  searchSubject(
    searchString: string,
    sort?: BgmSubjectSearchSorting,
    filter?: BgmSubjectSearchFilterModel
  ) {
    console.log('searchSubject', searchString, sort, filter)
    return queryClient.fetchInfiniteQuery(
      this.searchSubjectsQueryOptions(searchString, sort, filter)
    )
  }
}
