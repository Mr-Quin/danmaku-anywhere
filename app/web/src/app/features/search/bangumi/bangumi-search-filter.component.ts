import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core'
import { Button } from 'primeng/button'
import { type Menu, MenuModule } from 'primeng/menu'
import type { BgmSubjectSearchFilterModel } from '../../bangumi/types/bangumi.types'
import {
  SearchFilterItem,
  type SearchFilterModel,
} from '../filter/search-filter-item.component'
import { SearchService } from '../search.service'
import { parseBangumiFilterList } from './parseBangumiFilter'

@Component({
  selector: 'da-bangumi-subject-filter-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, MenuModule, SearchFilterItem, Button],
  template: `
    <p-menu #addMenu [popup]="true" [model]="$addMenuItems" appendTo="body"></p-menu>
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-2 items-center">
        @for (item of $ratings(); track $index) {
          <da-search-filter-item
            [label]="'评分'"
            [type]="'rating'"
            [filter]="item"
            (change)="updateRating($index, $event)"
            (remove)="removeRating($index)"
          />
        }

        @for (item of $ranks(); track $index) {
          <da-search-filter-item
            [label]="'排名'"
            [type]="'rank'"
            [filter]="item"
            (change)="updateRank($index, $event)"
            (remove)="removeRank($index)"
          />
        }

        @for (item of $airDates(); track $index) {
          <da-search-filter-item
            [label]="'日期'"
            [type]="'date'"
            [filter]="item"
            (change)="updateAirDate($index, $event)"
            (remove)="removeAirDate($index)"
          />
        }
        <p-button styleClass="h-6 p-1" label="筛选" severity="secondary" variant="outlined" size="small" (click)="$addMenu().toggle($event)">
            <i class="pi pi-filter text-xs"></i>
          </p-button>
      </div>
    </div>
  `,
})
export class BangumiSearchFilterComponent {
  private readonly searchService = inject(SearchService)

  filter = computed(() => {
    const draft = this.searchService.$draft()
    if (draft.provider !== 'bangumi') {
      return {}
    }
    return draft.filter ?? {}
  })

  $addMenu = viewChild.required<Menu>('addMenu')
  readonly $addMenuItems = [
    { label: '评分', command: () => this.addRating() },
    { label: '排名', command: () => this.addRank() },
    { label: '播出日期', command: () => this.addAirDate() },
  ]

  readonly $airDates = signal<SearchFilterModel[]>([])
  readonly $ratings = signal<SearchFilterModel[]>([])
  readonly $ranks = signal<SearchFilterModel[]>([])

  constructor() {
    effect(() => {
      const current = this.filter()
      this.$airDates.set(parseBangumiFilterList(current.air_date ?? []))
      this.$ratings.set(parseBangumiFilterList(current.rating ?? []))
      this.$ranks.set(parseBangumiFilterList(current.rank ?? []))
    })
  }

  addAirDate(): void {
    this.$airDates.update((arr) => [
      ...arr,
      {
        op: '<=',
        value: new Date()
          .toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          .replace(/\//g, '-'),
      },
    ])
    this.emitChange()
  }

  updateAirDate(index: number, next: SearchFilterModel): void {
    this.$airDates.update((arr) => {
      const copy = arr.toSpliced(index, 1, {
        op: next.op ?? '>=',
        value: String(next.value),
      })
      return copy
    })
    this.emitChange()
  }

  removeAirDate(index: number): void {
    this.$airDates.update((arr) => arr.toSpliced(index, 1))
    this.emitChange()
  }

  addRating(): void {
    this.$ratings.update((arr) => [...arr, { op: '>=', value: 7 }])
    this.emitChange()
  }

  updateRating(index: number, next: SearchFilterModel): void {
    this.$ratings.update((arr) => {
      const numeric = Number(next.value)
      const prev = arr[index]?.value ?? 0
      const value = Number.isNaN(numeric) ? prev : numeric
      const copy = arr.toSpliced(index, 1, { op: next.op ?? '>=', value })
      return copy
    })
    this.emitChange()
  }

  removeRating(index: number): void {
    this.$ratings.update((arr) => arr.toSpliced(index, 1))
    this.emitChange()
  }

  addRank(): void {
    this.$ranks.update((arr) => [...arr, { op: '>=', value: 1 }])
    this.emitChange()
  }

  updateRank(index: number, next: SearchFilterModel): void {
    this.$ranks.update((arr) => {
      const numeric = Number(next.value)
      const prev = arr[index]?.value ?? 1
      const value = Number.isNaN(numeric) ? prev : numeric
      const copy = arr.toSpliced(index, 1, { op: next.op ?? '>=', value })
      return copy
    })
    this.emitChange()
  }

  removeRank(index: number): void {
    this.$ranks.update((arr) => arr.toSpliced(index, 1))
    this.emitChange()
  }

  emitChange(): void {
    const incoming = this.filter()

    const air_date = this.$airDates()
      .filter((x) => x.value && String(x.value).trim().length > 0)
      .map((x) => `${x.op}${x.value}`)

    const rating = this.$ratings().map((x) => `${x.op}${x.value}`)

    const rank = this.$ranks().map((x) => `${x.op}${x.value}`)

    const next: BgmSubjectSearchFilterModel = {
      type: incoming.type,
      meta_tags: incoming.meta_tags,
      tag: incoming.tag,
      air_date: air_date.length > 0 ? air_date : undefined,
      rating: rating.length > 0 ? rating : undefined,
      rank: rank.length > 0 ? rank : undefined,
    }

    this.searchService.setBangumiFilter(next)
  }
}
