import { Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { KazumiService } from '../kazumi/services/kazumi.service'
import { SearchHistoryService } from './history/search-history.service'

export type SearchProvider = 'kazumi' | 'bangumi'

@Injectable({ providedIn: 'root' })
export class SearchService {
  private router = inject(Router)
  private kazumiService = inject(KazumiService)
  private searchHistory = inject(SearchHistoryService)

  private readonly $_visible = signal(false)
  private readonly $_term = signal('')

  readonly $provider = signal<SearchProvider>('bangumi')
  readonly $visible = this.$_visible.asReadonly()
  readonly $term = this.$_term.asReadonly()

  open(options?: { provider?: SearchProvider; term?: string }) {
    if (options?.provider) {
      this.$provider.set(options.provider)
    }
    if (options?.term !== undefined) {
      this.$_term.set(options.term)
    }
    this.$_visible.set(true)
  }

  close() {
    this.$_visible.set(false)
  }

  setProvider(entry: SearchProvider) {
    this.$provider.set(entry)
  }

  setTerm(term: string) {
    this.$_term.set(term)
  }

  async search(term: string, provider?: SearchProvider) {
    const searchTerm = term.trim()
    this.$_term.set(searchTerm)

    const activeProvider = provider ?? this.$provider()
    if (!searchTerm) {
      return
    }

    this.searchHistory.add({
      provider: activeProvider,
      term: searchTerm,
      sorting: null,
      filter: null,
    })

    if (activeProvider === 'kazumi') {
      this.kazumiService.updateQuery(searchTerm)
      await this.router.navigate(['/kazumi/search'], {
        queryParams: { q: searchTerm },
        queryParamsHandling: 'merge',
      })
      this.close()
      return
    }
  }
}
