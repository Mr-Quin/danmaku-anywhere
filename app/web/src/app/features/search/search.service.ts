import { Injectable, computed, signal, inject } from '@angular/core'
import { Router } from '@angular/router'
import { BangumiService } from '../bangumi/services/bangumi.service'
import { KazumiService } from '../kazumi/services/kazumi.service'

export type SearchProvider = 'kazumi' | 'bangumi'

@Injectable({ providedIn: 'root' })
export class SearchService {
  private router = inject(Router)
  private bangumiService = inject(BangumiService)
  private kazumiService = inject(KazumiService)

  // state
  private readonly visible = signal(false)
  private readonly provider = signal<SearchProvider>('kazumi')
  private readonly term = signal('')

  // getters
  $visible = computed(() => this.visible())
  $provider = computed(() => this.provider())
  $term = computed(() => this.term())

  open(options?: { provider?: SearchProvider; term?: string }) {
    if (options?.provider) this.provider.set(options.provider)
    if (options?.term !== undefined) this.term.set(options.term)
    this.visible.set(true)
  }

  close() {
    this.visible.set(false)
  }

  setTerm(term: string) {
    this.term.set(term)
  }

  setProvider(provider: SearchProvider) {
    this.provider.set(provider)
  }

  async search(term?: string, provider?: SearchProvider) {
    const searchTerm = (term ?? this.term()).trim()
    const activeProvider = provider ?? this.provider()
    if (!searchTerm) return

    if (activeProvider === 'kazumi') {
      // Navigate to Kazumi search page with query param
      this.kazumiService.updateQuery(searchTerm)
      await this.router.navigate(['/kazumi/search'], {
        queryParams: { q: searchTerm },
        queryParamsHandling: 'merge',
      })
      this.close()
      return
    }

    if (activeProvider === 'bangumi') {
      // Prepare bangumi search; consumer components can use the query options
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _options = this.bangumiService.searchSubjectsQueryOptions(
        searchTerm,
        'match'
      )
      this.close()
      return
    }
  }
}

