import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Card } from 'primeng/card'
import { Divider } from 'primeng/divider'
import { ProgressSpinner } from 'primeng/progressspinner'
import { BangumiService } from '../services/bangumi.service'

@Component({
  selector: 'da-episodes-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ProgressSpinner, Card, Divider],
  template: `
    @if (episodesQuery.isPending()) {
      <div class="flex justify-center py-8">
        <p-progress-spinner />
      </div>
    } @else if (episodesQuery.isSuccess()) {
      @let response = episodesQuery.data();
      @if (response?.data && response.data.length > 0) {
        <div>
          @for (episode of response.data; track episode.id) {
            <div class="flex justify-between items-start gap-2">
              <div class="flex-1 overflow-hidden">
                <h4 class="font-semibold overflow-hidden text-ellipsis">
                  {{ episode.sort }}. {{ episode.nameCN || episode.name }}
                </h4>
                @if (episode.nameCN && episode.name !== episode.nameCN) {
                  <p class="text-sm text-gray-500">{{ episode.name }}</p>
                }
                @if (episode.desc) {
                  <p class="text-sm mt-2">{{ episode.desc }}</p>
                }
              </div>
              <div class="text-sm text-gray-500">
                @if (episode.airdate) {
                  <p>{{ episode.airdate }}</p>
                }
              </div>
            </div>
            <p-divider />
          }
        </div>
      } @else {
        <p-card>
          <p class="text-gray-500">暂无剧集信息</p>
        </p-card>
      }
    } @else {
      <p-card>
        <p class="text-red-500">加载剧集信息失败</p>
      </p-card>
    }
  `,
})
export class EpisodesTabComponent {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  protected episodesQuery = injectQuery(() => {
    return {
      ...this.bangumiService.getSubjectEpisodesQueryOptions(this.subjectId()),
      enabled: this.visited(),
    }
  })
}
