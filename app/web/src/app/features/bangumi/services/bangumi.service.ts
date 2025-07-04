import { Injectable } from '@angular/core'
import {
  infiniteQueryOptions,
  queryOptions,
} from '@tanstack/angular-query-experimental'
import { bangumiNextClient } from '../../../bangumi-api/client'
import { queryKeys } from '../../../shared/query/queryKeys'
import type {
  BgmCalendar,
  BgmSubject,
  BgmTrendingSubject,
} from '../types/bangumi.types'

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

  getTrendingQueryOptions = (limit = 20, offset = 0) =>
    queryOptions({
      queryKey: queryKeys.bangumi.trending(limit, offset),
      queryFn: async (): Promise<BgmTrendingSubject[]> => {
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
        return res.data!.data
      },
    })

  getTrendingInfiniteQueryOptions = () =>
    infiniteQueryOptions({
      queryKey: queryKeys.bangumi.trendingInfinite(),
      queryFn: async ({ pageParam = 0 }): Promise<BgmTrendingSubject[]> => {
        const limit = 20
        const offset = (pageParam as number) * limit
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
        return res.data!.data
      },
      initialPageParam: 0,
      getNextPageParam: (
        lastPage: BgmTrendingSubject[],
        allPages: BgmTrendingSubject[][]
      ) => {
        // If we get less than the limit, we've reached the end
        return lastPage.length < 20 ? undefined : allPages.length
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
}
