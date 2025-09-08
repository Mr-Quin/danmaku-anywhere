import { computed, Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { BangumiService } from '../bangumi/services/bangumi.service'
import type {
  BgmSubjectSearchFilterModel,
  BgmSubjectSearchSorting,
} from '../bangumi/types/bangumi.types'
import { KazumiService } from '../kazumi/services/kazumi.service'
import { SearchHistoryService } from './history/search-history.service'
import type {
  BangumiSearchModel,
  SearchModel,
  SearchProvider,
} from './search-model.type'

const providerRegistry: {
  [K in SearchProvider]: Extract<SearchModel, { provider: K }>
} = {
  bangumi: {
    provider: 'bangumi',
    term: '',
    sorting: undefined,
    filter: {
      type: [2],
    },
  },
  kazumi: {
    provider: 'kazumi',
    term: '',
  },
} as const

@Injectable({ providedIn: 'root' })
export class SearchService {
  private router = inject(Router)
  private kazumiService = inject(KazumiService)
  private bangumiService = inject(BangumiService)
  private searchHistory = inject(SearchHistoryService)

  private readonly $_visible = signal(false)
  private readonly $_model = signal<SearchModel | null>(null)
  private readonly $_provider = signal<SearchProvider>('bangumi')

  private readonly $_drafts = signal(providerRegistry)

  readonly $visible = this.$_visible.asReadonly()
  readonly $model = this.$_model.asReadonly()
  readonly $provider = this.$_provider.asReadonly()
  readonly $hasModel = computed(() => {
    return this.$_model() !== null
  })
  readonly $draft = computed(() => {
    const provider = this.$_provider()
    return this.$_drafts()[provider]
  })

  open(options?: { provider?: SearchProvider; term?: string }) {
    this.$_model.set(null)
    const provider = options?.provider ?? 'bangumi'
    this.setProvider(provider)

    this.$_drafts.update((drafts) => ({
      ...drafts,
      [provider]: { ...providerRegistry[provider], term: options?.term ?? '' },
    }))

    this.$_visible.set(true)
  }

  close() {
    this.$_visible.set(false)
  }

  clear() {
    this.$_model.set(null)
    const provider = this.$_provider()
    this.$_drafts.update((drafts) => ({
      ...drafts,
      [provider]: providerRegistry[provider],
    }))
  }

  setProvider(provider: SearchProvider) {
    this.$_provider.set(provider)
  }

  setTerm(term: string) {
    const provider = this.$_provider()
    this.$_drafts.update((drafts) => ({
      ...drafts,
      [provider]: { ...drafts[provider], term },
    }))
  }

  setBangumiSorting(sorting: BgmSubjectSearchSorting | null) {
    this.$_drafts.update((drafts) => {
      const bangumiDraft = drafts.bangumi as BangumiSearchModel
      return {
        ...drafts,
        bangumi: { ...bangumiDraft, sorting: sorting ?? undefined },
      }
    })
  }

  setBangumiFilter(filter: BgmSubjectSearchFilterModel | null) {
    this.$_drafts.update((drafts) => {
      const bangumiDraft = drafts.bangumi as BangumiSearchModel
      return {
        ...drafts,
        bangumi: { ...bangumiDraft, filter: filter ?? undefined },
      }
    })
  }

  async search(model?: SearchModel) {
    const searchModel = model ?? this.$draft()
    this.$_model.set(searchModel)
    this.$_drafts.update((drafts) => ({
      ...drafts,
      [searchModel.provider]: searchModel,
    }))
    this.$_provider.set(searchModel.provider)

    this.searchHistory.add(searchModel)

    if (searchModel.provider === 'kazumi') {
      this.kazumiService.updateQuery(searchModel.term)
      await this.router.navigate(['/kazumi/search'], {
        queryParams: { q: searchModel.term },
        queryParamsHandling: 'merge',
      })
      this.close()
      return
    }

    if (searchModel.provider === 'bangumi') {
      this.bangumiService.searchSubject(
        searchModel.term,
        searchModel.sorting,
        searchModel.filter
      )
      return
    }
  }
}
