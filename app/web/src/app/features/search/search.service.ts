import {
  computed,
  Injectable,
  inject,
  linkedSignal,
  signal,
} from '@angular/core'
import { Router } from '@angular/router'
import { KazumiService } from '../kazumi/services/kazumi.service'
import { SearchHistoryService } from './history/search-history.service'

export type SearchProvider = 'kazumi' | 'bangumi'

export interface SearchModel {
  provider: SearchProvider
  term: string
  sorting?: string
  filter?: Record<string, any>
}

const DEFAULT_MODEL: SearchModel = {
  provider: 'bangumi',
  term: '',
  sorting: undefined,
  filter: undefined,
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private router = inject(Router)
  private kazumiService = inject(KazumiService)
  private searchHistory = inject(SearchHistoryService)

  private readonly $_visible = signal(false)
  private readonly $_model = signal<SearchModel | null>(null)
  private readonly $_draftModel = linkedSignal<SearchModel>(() => {
    const model = this.$_model()
    if (model) {
      return model
    }
    return DEFAULT_MODEL
  })

  readonly $hasModel = computed(() => {
    console.log('hasModel', this.$_model(), this.$_model() !== null)
    return this.$_model() !== null
  })
  readonly $model = this.$_model.asReadonly()
  readonly $draft = this.$_draftModel.asReadonly()
  readonly $visible = this.$_visible.asReadonly()

  open(options?: { provider?: SearchProvider; term?: string }) {
    this.$_model.set(null)
    if (options?.provider) {
      this.$_draftModel.set({ ...DEFAULT_MODEL, provider: options.provider })
    }
    if (options?.term !== undefined) {
      this.$_draftModel.set({ ...DEFAULT_MODEL, term: options.term })
    }
    this.$_visible.set(true)
  }

  close() {
    this.$_model.set(null)
    this.$_draftModel.set(DEFAULT_MODEL)
    this.$_visible.set(false)
  }

  setProvider(entry: SearchProvider) {
    this.$_draftModel.update((model) => ({
      ...model,
      provider: entry,
      term: model.term,
    }))
  }

  setTerm(term: string) {
    this.$_draftModel.update((model) => ({ ...model, term }))
  }

  setSorting(sorting: string | null) {
    this.$_draftModel.update((model) => ({
      ...model,
      sorting: sorting ?? undefined,
    }))
  }

  setFilter(filter: Record<string, any> | null) {
    this.$_draftModel.update((model) => ({
      ...model,
      filter: filter ?? undefined,
    }))
  }

  async search(model?: SearchModel) {
    const searchModel = model ?? this.$_draftModel()
    this.$_model.set(searchModel)

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
  }
}
