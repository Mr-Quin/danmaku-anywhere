import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core'
import { injectQuery } from '@tanstack/angular-query-experimental'
import { Card } from 'primeng/card'
import { ProgressSpinner } from 'primeng/progressspinner'
import { BangumiService } from '../services/bangumi.service'

@Component({
  selector: 'da-characters-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ProgressSpinner, Card],
  template: `
    @if (charactersQuery.isPending()) {
      <div class="flex justify-center py-8">
        <p-progress-spinner />
      </div>
    } @else if (charactersQuery.isSuccess()) {
      @let response = charactersQuery.data();
      @if (response?.data && response.data.length > 0) {
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          @for (character of response.data; track character.character.id) {
            <div class="flex gap-4">
              <img
                [src]="character.character.images?.medium"
                [alt]="character.character.name"
                class="w-16 h-16 object-cover rounded"
              />
              <div class="flex-1">
                <h4 class="font-semibold">{{ character.character.nameCN || character.character.name }}</h4>
                @if (character.character.nameCN && character.character.name !== character.character.nameCN) {
                  <p class="text-sm text-gray-600">{{ character.character.name }}</p>
                }
                @if (character.actors && character.actors.length > 0) {
                  <p class="text-sm text-gray-500 mt-1">
                    声优: {{ character.actors[0].nameCN || character.actors[0].name }}
                  </p>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <p-card>
          <p class="text-gray-500">暂无角色信息</p>
        </p-card>
      }
    } @else {
      <p-card>
        <p class="text-red-500">加载角色信息失败</p>
      </p-card>
    }
  `,
})
export class CharactersTab {
  subjectId = input.required<number>()
  visited = input<boolean>(false)

  private bangumiService = inject(BangumiService)

  private queryOptions = computed(() => {
    if (!this.visited()) {
      return { enabled: false, queryKey: ['characters', this.subjectId()] }
    }
    return this.bangumiService.getSubjectCharactersQueryOptions(
      this.subjectId()
    )
  })

  protected charactersQuery = injectQuery(this.queryOptions)
}
