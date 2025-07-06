import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Card } from 'primeng/card'
import { BangumiService } from '../services/bangumi.service'
import { HorizontalCardSkeletonGrid } from './horizontal-card-skeleton-grid'

@Component({
  selector: 'da-recommendations-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, Card, HorizontalCardSkeletonGrid],
  template: `
    @if (recommendationsQuery.isPending()) {
      <da-horizontal-card-skeleton-grid [count]="5" />
    } @else if (recommendationsQuery.isSuccess()) {
      @let response = recommendationsQuery.data();
      @if (response?.data && response.data.length > 0) {
        <div class="grid gap-4">
          @for (recommendation of response.data; track recommendation.subject.id) {
            <div class="flex gap-4">
              <img
                [src]="recommendation.subject.images?.medium || 'assets/cover_fallback.webp'"
                [alt]="recommendation.subject.name"
                class="w-20 h-28 object-cover rounded"
              />
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                      推荐度: {{ (recommendation.sim * 100).toFixed(0) }}%
                    </span>
                  <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {{ recommendation.count }}人推荐
                    </span>
                </div>
                <h4 class="font-semibold">
                  <a [routerLink]="['/bangumi', recommendation.subject.id]" class="hover:text-blue-600">
                    {{ recommendation.subject.nameCN || recommendation.subject.name }}
                  </a>
                </h4>
                @if (recommendation.subject.nameCN && recommendation.subject.name !== recommendation.subject.nameCN) {
                  <p class="text-sm text-gray-600">{{ recommendation.subject.name }}</p>
                }
                @if (recommendation.subject.rating.score) {
                  <p class="text-sm text-gray-500 mt-1">
                    评分: {{ recommendation.subject.rating.score.toFixed(1) }}
                  </p>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <p-card>
          <p class="text-gray-500">暂无推荐作品</p>
        </p-card>
      }
    } @else {
      <p-card>
        <p class="text-red-500">加载推荐作品失败</p>
      </p-card>
    }
  `,
})
export class RecommendationsTab {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  protected recommendationsQuery = injectQuery(() => {
    return {
      ...this.bangumiService.getSubjectRecsQueryOptions(this.subjectId()),
      enabled: this.visited(),
    }
  })
}
