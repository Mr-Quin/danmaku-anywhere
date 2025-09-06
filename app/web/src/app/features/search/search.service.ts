import { Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { KazumiService } from '../kazumi/services/kazumi.service'

export type SearchProvider = 'kazumi' | 'bangumi'

@Injectable({ providedIn: 'root' })
export class SearchService {
  private router = inject(Router)
  private kazumiService = inject(KazumiService)

  private readonly $_visible = signal(false)
  private readonly $_provider = signal<SearchProvider>('kazumi')
  private readonly $_term = signal('')

  $visible = this.$_visible.asReadonly()
  $provider = this.$_provider.asReadonly()
  $term = this.$_term.asReadonly()

  open(options?: { provider?: SearchProvider; term?: string }) {
    if (options?.provider) {
      this.$_provider.set(options.provider)
    }
    if (options?.term !== undefined) {
      this.$_term.set(options.term)
    }
    this.$_visible.set(true)
  }

  close() {
    this.$_visible.set(false)
  }

  setTerm(term: string) {
    this.$_term.set(term)
  }

  setProvider(provider: SearchProvider) {
    this.$_provider.set(provider)
  }

  async search(term: string, provider?: SearchProvider) {
    const searchTerm = term.trim()
    this.$_term.set(searchTerm)
    const activeProvider = provider ?? this.$_provider()
    if (!searchTerm) {
      return
    }

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
