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
import { Tag } from 'primeng/tag'
import { BangumiService } from '../services/bangumi.service'
import { HorizontalCardSkeletonGrid } from './horizontal-card-skeleton-grid'

@Component({
  selector: 'da-relations-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, Card, HorizontalCardSkeletonGrid, Tag],
  template: `
    @if (relationsQuery.isPending()) {
      <da-horizontal-card-skeleton-grid [count]="5" />
    } @else if (relationsQuery.isSuccess()) {
      @let response = relationsQuery.data();
      @if (response?.data && response.data.length > 0) {
        <div class="grid gap-4">
          @for (relation of response.data; track relation.subject.id) {
            <div class="flex gap-4">
              <img
                [src]="relation.subject.images?.medium"
                [alt]="relation.subject.name"
                class="w-20 h-28 object-cover rounded"
              />
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <p-tag
                    [value]="relation.relation.cn"
                    severity="info"
                    styleClass="bg-purple-100 text-purple-800"
                    size="small"
                  />
                </div>
                <h4 class="font-semibold">
                  <a [routerLink]="['/bangumi', relation.subject.id]" class="hover:underline">
                    {{ relation.subject.nameCN || relation.subject.name }}
                  </a>
                </h4>
                @if (relation.subject.nameCN && relation.subject.name !== relation.subject.nameCN) {
                  <p class="text-sm text-gray-600">{{ relation.subject.name }}</p>
                }
                @if (relation.subject.rating.score) {
                  <p class="text-sm text-gray-500 mt-1">
                    评分: {{ relation.subject.rating.score.toFixed(1) }}
                  </p>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <p-card>
          <p class="text-gray-500">暂无相关作品信息</p>
        </p-card>
      }
    } @else {
      <p-card>
        <p class="text-red-500">加载相关作品信息失败</p>
      </p-card>
    }
  `,
})
export class RelationsTab {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  protected relationsQuery = injectQuery(() => {
    return {
      ...this.bangumiService.getSubjectRelationsQueryOptions(this.subjectId()),
      enabled: this.visited(),
    }
  })
}
