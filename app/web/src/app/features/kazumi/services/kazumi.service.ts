import {
  computed,
  effect,
  Injectable,
  inject,
  signal,
  untracked,
} from '@angular/core'
import {
  getManifest,
  getPolicy,
  type KazumiPolicy,
} from '@danmaku-anywhere/danmaku-provider/kazumi'
import type { MediaInfo, SetHeaderRule } from '@danmaku-anywhere/web-scraper'
import {
  injectMutation,
  injectQuery,
  QueryClient,
  queryOptions,
} from '@tanstack/angular-query-experimental'
import Dexie, { type Table } from 'dexie'
import {
  EMPTY,
  lastValueFrom,
  type Observable,
  scan,
  shareReplay,
  startWith,
  tap,
} from 'rxjs'
import { ExtensionService } from '../../../core/extension/extension.service'
import { queryKeys } from '../../../shared/query/queryKeys'
import { sortArrayByOrder } from '../../../shared/utils/utils'

interface Setting<T> {
  key: string
  value: T
}

type PolicyOrder = string[]
const POLICY_ORDER_KEY = 'policyOrder'

class KazumiDb extends Dexie {
  policies!: Table<KazumiPolicy, string>
  settings!: Table<Setting<unknown>, string>

  constructor() {
    super('KazumiDatabase')

    this.version(1).stores({
      policies: '&name',
      settings: '&key',
    })
  }

  async setOrder(order: PolicyOrder) {
    return this.settings.put({ key: POLICY_ORDER_KEY, value: order })
  }

  async getOrders() {
    const item = await this.settings.get(POLICY_ORDER_KEY)
    if (item) {
      return item.value as PolicyOrder
    }
    return undefined
  }
}

export interface MediaSearchDetails {
  // url of the show
  url: string
  // title of the show
  title: string
  policy: KazumiPolicy
}

@Injectable({
  providedIn: 'root',
})
export class KazumiService {
  private readonly db = new KazumiDb()
  private readonly extensionService = inject(ExtensionService)
  private readonly queryClient = inject(QueryClient)

  // active policy for tab
  private readonly $_activePolicy = signal<KazumiPolicy | null>(null)
  readonly $activePolicy = this.$_activePolicy.asReadonly()

  // search query
  private readonly $_searchQuery = signal('')
  readonly $searchQuery = this.$_searchQuery.asReadonly()

  // for policy imports
  private readonly $_inProgressImports = signal(new Set<string>())
  readonly $inProgressImports = this.$_inProgressImports.asReadonly()

  // determine if a tab should load its query
  private readonly $_visitedTabs = signal(new Map<string, boolean>())
  readonly $visitedTabs = this.$_visitedTabs.asReadonly()

  // the search result to load episodes for
  private readonly $_mediaSearchDetails = signal<MediaSearchDetails | null>(
    null
  )
  readonly $searchDetails = this.$_mediaSearchDetails.asReadonly()
  readonly $hasSearchDetails = computed(() => this.$searchDetails() !== null)

  readonly $hasOutdatedPolicy = computed(() => {
    if (
      !this.manifestsQuery.isSuccess() ||
      !this.localPoliciesQuery.isSuccess()
    ) {
      return false
    }
    const manifests = this.manifestsQuery.data()
    return this.localPoliciesQuery.data().some((p) => {
      const match = manifests.find((m) => {
        return m.name === p.name
      })
      return !!(match && match.version !== p.version)
    })
  })

  readonly $hasPolicies = computed(() => {
    const policies = this.localPoliciesQuery.data()
    if (policies) {
      return policies.length > 0
    }
    return false
  })

  // set active policy when allPoliciesQuery resolves
  #_ = effect(() => {
    if (
      !untracked(this.$_activePolicy) &&
      this.localPoliciesQuery.isSuccess() &&
      this.localPoliciesQuery.data().length
    ) {
      this.setActivePolicy(this.localPoliciesQuery.data()[0])
    }
  })

  // update visitedTabs when _activePolicy changes
  #__ = effect(() => {
    const activePolicy = this.$_activePolicy()
    // skip if there is no query
    if (!activePolicy || !this.$_searchQuery()) return
    this.$_visitedTabs.update((m) => {
      m.set(activePolicy.name, true)
      return m
    })
  })

  readonly localPoliciesQuery = injectQuery(() => ({
    queryFn: async () => {
      const policies = await this.db.policies.toArray()
      const orderSetting = await this.db.getOrders()

      return sortArrayByOrder(policies, orderSetting, (p) => p.name)
    },
    queryKey: queryKeys.kazumi.local.all(),
  }))

  readonly manifestsQuery = injectQuery(() => {
    return {
      queryFn: () => getManifest(),
      queryKey: queryKeys.kazumi.manifest.all(),
    }
  })

  readonly orderQuery = injectQuery(() => {
    return {
      queryFn: async () => {
        const order = await this.db.getOrders()
        return order || []
      },
      queryKey: queryKeys.kazumi.settings.order(),
    }
  })

  readonly addPolicyMutation = injectMutation(() => ({
    mutationKey: queryKeys.kazumi.local.all(),
    mutationFn: async (name: string) => {
      const policy = await getPolicy(name)

      await this.db.transaction(
        'rw',
        this.db.policies,
        this.db.settings,
        async (db) => {
          // if the policy exists, just do an update
          const isExisting = !!(await db.policies.get(name))
          await db.policies.put(policy)

          // for new policies, update the order settings
          if (!isExisting) {
            const orderSetting = this.orderQuery.data()
            const newOrder = [...(orderSetting ?? []), name]
            await this.updatePolicyOrderMutation.mutate(newOrder)
          }
        }
      )
      return name
    },
    onMutate: (name) => {
      this.$_inProgressImports.update((s) => new Set(s).add(name))
    },
    onSettled: (_, __, name) => {
      this.$_inProgressImports.update((s) => {
        const newSet = new Set(s)
        newSet.delete(name)
        return newSet
      })
    },
  }))

  readonly deletePolicyMutation = injectMutation(() => ({
    mutationKey: queryKeys.kazumi.local.all(),
    mutationFn: async (name: string) => {
      await this.db.transaction(
        'rw',
        this.db.policies,
        this.db.settings,
        async () => {
          await this.db.policies.delete(name)
          const orderSetting = this.orderQuery.data()
          // if an order is set, remove the deleted policy's name from it
          if (orderSetting) {
            const newOrder = orderSetting.filter((pName) => pName !== name)
            await this.updatePolicyOrderMutation.mutate(newOrder)
          }
        }
      )
      return name
    },
  }))

  readonly addRecommendedPolicyMutation = injectMutation(() => ({
    mutationKey: queryKeys.kazumi.local.all(),
    mutationFn: async () => {
      if (!this.manifestsQuery.isSuccess()) {
        return
      }

      const manifest = this.manifestsQuery.data()
      const recommendedKeys = ['dlma', '7sefun', 'ffdm', 'yinghua']

      for (const policy of manifest.filter((m) =>
        recommendedKeys.includes(m.name)
      )) {
        await this.addPolicyMutation.mutateAsync(policy.name)
      }
    },
  }))

  readonly updatePolicyOrderMutation = injectMutation(() => ({
    mutationFn: async (order: PolicyOrder) => {
      return this.db.setOrder(order)
    },
    onSuccess: () => {
      void this.queryClient.invalidateQueries({
        queryKey: queryKeys.kazumi.settings.order(),
      })
      void this.queryClient.invalidateQueries({
        queryKey: queryKeys.kazumi.local.all(),
      })
    },
  }))

  readonly setHeadersMutation = injectMutation(() => ({
    mutationFn: (headerRule: SetHeaderRule) =>
      lastValueFrom(
        this.extensionService.single('setRequestHeaders', headerRule)
      ),
  }))

  getSearchQueryOptions(keyword: string, policy: KazumiPolicy) {
    return queryOptions({
      queryFn: async () => {
        return lastValueFrom(
          this.extensionService.single('kazumiSearch', {
            keyword,
            policy,
          })
        )
      },
      queryKey: queryKeys.kazumi.search(policy.name, keyword),
      enabled: !!keyword.trim(),
      staleTime: Number.POSITIVE_INFINITY,
    })
  }

  getChaptersQueryOptions(url: string, policy: KazumiPolicy) {
    return queryOptions({
      queryFn: async () => {
        const playlists = await lastValueFrom(
          this.extensionService.single('kazumiGetChapters', { url, policy })
        )
        return playlists.map((playlist) => {
          return playlist.toSorted((a, b) => {
            return a.name.localeCompare(b.name)
          })
        })
      },
      queryKey: queryKeys.kazumi.getChapters(policy.name, url),
      staleTime: Number.POSITIVE_INFINITY,
    })
  }

  private mediaStreamCache = new Map<string, Observable<MediaInfo[]>>()

  getMediaInfoStream(url: string | null): Observable<MediaInfo[]> {
    if (!url) {
      return EMPTY
    }

    // return cached observable if there is one
    if (this.mediaStreamCache.has(url)) {
      // biome-ignore lint/style/noNonNullAssertion: checked above
      return this.mediaStreamCache.get(url)!
    }

    const newStream$ = this.extensionService
      .stream('extractMedia', { url })
      .pipe(
        tap(async (info: MediaInfo) => {
          // update net request rules to set headers
          const origin = new URL(url).origin
          const videoUrl = new URL(info.src)
          await this.setHeadersMutation.mutateAsync({
            url: videoUrl.origin,
            referer: origin,
          })
        }),
        // convert stream to emit an array
        scan((acc, value) => [...acc, value], [] as MediaInfo[]),
        startWith([]),
        shareReplay({ bufferSize: 1, refCount: false })
      )

    // cache the observable
    this.mediaStreamCache.set(url, newStream$)
    return newStream$
  }

  setActivePolicy(policy: KazumiPolicy | null) {
    this.$_activePolicy.set(policy)
  }

  updateQuery(query: string) {
    this.$_searchQuery.set(query)
  }

  updateSearchDetails(detail: MediaSearchDetails | null) {
    this.$_mediaSearchDetails.set(detail)
  }
}
