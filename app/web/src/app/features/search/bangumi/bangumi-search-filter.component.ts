import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core'
import { Button } from 'primeng/button'
import { type Menu, MenuModule } from 'primeng/menu'
import type { ComparisonOperator } from '../filter/comparison-selector.component'
import {
  SearchFilterItem,
  type SearchFilterModel,
} from '../filter/search-filter-item.component'

interface ComparisonItem<TValue> {
  op: ComparisonOperator
  value: TValue
}

export interface BangumiSubjectSearchFilterModel {
  // Part of schema but UI not implemented yet
  type?: number[]
  meta_tags?: string[]
  tag?: string[]

  // Implemented in UI below
  air_date?: string[]
  rating?: string[]
  rank?: string[]
}

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
  filter = input<BangumiSubjectSearchFilterModel>({})
  filterChange = output<BangumiSubjectSearchFilterModel>()

  $addMenu = viewChild.required<Menu>('addMenu')
  readonly $addMenuItems = [
    { label: '评分', command: () => this.addRating() },
    { label: '排名', command: () => this.addRank() },
    { label: '播出日期', command: () => this.addAirDate() },
  ]

  private readonly airDates = signal<ComparisonItem<string>[]>([])
  private readonly ratings = signal<ComparisonItem<number>[]>([])
  private readonly ranks = signal<ComparisonItem<number>[]>([])

  $airDates = computed(() => this.airDates())
  $ratings = computed(() => this.ratings())
  $ranks = computed(() => this.ranks())

  constructor() {
    effect(() => {
      const current = this.filter()
      this.airDates.set(
        this.parseComparisonList(current.air_date ?? [], 'date')
      )
      this.ratings.set(
        this.parseComparisonList(current.rating ?? [], 'number').map((x) => ({
          op: x.op,
          value: x.value as number,
        }))
      )
      this.ranks.set(
        this.parseComparisonList(current.rank ?? [], 'number').map((x) => ({
          op: x.op,
          value: x.value as number,
        }))
      )
    })
  }

  addAirDate(): void {
    this.airDates.update((arr) => [
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
    this.airDates.update((arr) => {
      const copy = arr.toSpliced(index, 1, {
        op: next.op ?? '>=',
        value: String(next.value),
      })
      return copy
    })
    this.emitChange()
  }

  removeAirDate(index: number): void {
    this.airDates.update((arr) => arr.toSpliced(index, 1))
    this.emitChange()
  }

  addRating(): void {
    this.ratings.update((arr) => [...arr, { op: '>=', value: 7 }])
    this.emitChange()
  }

  updateRating(index: number, next: SearchFilterModel): void {
    this.ratings.update((arr) => {
      const numeric = Number(next.value)
      const prev = arr[index]?.value ?? 0
      const value = Number.isNaN(numeric) ? prev : numeric
      const copy = arr.toSpliced(index, 1, { op: next.op ?? '>=', value })
      return copy
    })
    this.emitChange()
  }

  removeRating(index: number): void {
    this.ratings.update((arr) => arr.toSpliced(index, 1))
    this.emitChange()
  }

  addRank(): void {
    this.ranks.update((arr) => [...arr, { op: '>=', value: 1 }])
    this.emitChange()
  }

  updateRank(index: number, next: SearchFilterModel): void {
    this.ranks.update((arr) => {
      const numeric = Number(next.value)
      const prev = arr[index]?.value ?? 1
      const value = Number.isNaN(numeric) ? prev : numeric
      const copy = arr.toSpliced(index, 1, { op: next.op ?? '>=', value })
      return copy
    })
    this.emitChange()
  }

  removeRank(index: number): void {
    this.ranks.update((arr) => arr.toSpliced(index, 1))
    this.emitChange()
  }

  emitChange(): void {
    const incoming = this.filter()

    const air_date = this.airDates()
      .filter((x) => x.value && String(x.value).trim().length > 0)
      .map((x) => `${x.op}${x.value}`)

    const rating = this.ratings().map((x) => `${x.op}${x.value}`)

    const rank = this.ranks().map((x) => `${x.op}${x.value}`)

    const next: BangumiSubjectSearchFilterModel = {
      // carry-through fields we are not editing yet
      type: incoming.type,
      meta_tags: incoming.meta_tags,
      tag: incoming.tag,
      // edited fields
      air_date: air_date.length > 0 ? air_date : undefined,
      rating: rating.length > 0 ? rating : undefined,
      rank: rank.length > 0 ? rank : undefined,
    }

    this.filterChange.emit(next)
  }

  private parseComparisonList(
    list: string[],
    kind: 'number'
  ): ComparisonItem<number>[]

  private parseComparisonList(
    list: string[],
    kind: 'date'
  ): ComparisonItem<string>[]

  private parseComparisonList(
    list: string[],
    kind: 'number' | 'date'
  ): ComparisonItem<number | string>[] {
    const result: ComparisonItem<number | string>[] = []
    for (const raw of list) {
      const match = /^(>=|>|=|<|<=)(.+)$/.exec(raw)
      if (!match) continue
      const op = match[1] as ComparisonOperator
      const valueRaw = match[2]?.trim() ?? ''
      if (kind === 'number') {
        const num = Number(valueRaw)
        if (!Number.isNaN(num)) {
          result.push({ op, value: num })
        }
      } else {
        result.push({ op, value: valueRaw })
      }
    }
    return result
  }
}
