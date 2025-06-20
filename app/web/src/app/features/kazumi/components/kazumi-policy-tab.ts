import { NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import type { KazumiPolicy } from '@danmaku-anywhere/danmaku-provider/kazumi'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Badge } from 'primeng/badge'
import { TooltipModule } from 'primeng/tooltip'
import { KazumiService } from '../services/kazumi.service'

@Component({
  selector: 'da-kazumi-policy-tab',
  imports: [NgClass, TooltipModule, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-1 items-center">
      <span>{{ policy().name }}</span>
      <p-badge
        [ngClass]="{
        'bg-yellow-600': searchQuery.isFetching(),
        'bg-green-600': searchQuery.isSuccess(),
        'bg-red-600': searchQuery.isError(),
        'bg-gray-600': !keyword() || !isVisited()
        }"
      ></p-badge>
    </div>
  `,
})
export class KazumiPolicyTab {
  policy = input.required<KazumiPolicy>()
  keyword = input.required<string>()
  isActive = input(false)
  isVisited = input(false)

  private kazumiService = inject(KazumiService)

  // same query as the search result
  protected searchQuery = injectQuery(() => ({
    ...this.kazumiService.getSearchQueryOptions(this.keyword(), this.policy()),
    enabled: !!this.keyword().trim() && this.isVisited(),
  }))
}
