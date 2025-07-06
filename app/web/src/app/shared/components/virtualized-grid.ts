import { CommonModule } from '@angular/common'
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  type ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  type TemplateRef,
  viewChild,
  viewChildren,
} from '@angular/core'
import { injectWindowVirtualizer } from '@tanstack/angular-virtual'
import { LayoutService, type ScreenSize } from '../../layout/layout.service'

export type VirtualGridItem =
  | {
      isSkeleton: true
    }
  | {
      isSkeleton: false
      data: unknown
    }

export type ColumnConfig = number | Partial<Record<ScreenSize, number>>

@Component({
  selector: 'da-virtualized-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (isLoading()) {
      <div class="grid gap-4 w-full"
           [style.grid-template-columns]="'repeat('+$columns()+', minmax(0, 1fr))'">
        @if (skeleton()) {
          @for (_ of $skeletonItems(); track $index; ) {
            <ng-container *ngTemplateOutlet="skeleton()"></ng-container>
          }
        }
      </div>
    } @else if (isError()) {
      @if (error()) {
        <ng-container *ngTemplateOutlet="error()"></ng-container>
      } @else {
        <div>
          Error
        </div>
      }
    } @else if (items().length === 0) {
      @if (empty()) {
        <ng-container *ngTemplateOutlet="empty()"></ng-container>
      } @else {
        <div>
          Empty
        </div>
      }
    } @else {
      <div [style.height.px]="rowVirtualizer.getTotalSize()" class="relative" #container>
        @for (row of rowVirtualizer.getVirtualItems(); track row.index; ) {
          @let rowItems = getRowItems(row.index);
          <div #virtualItem
               [attr.data-index]="row.index"
               class="absolute grid gap-4 w-full"
               [style.grid-template-columns]="'repeat('+$columns()+', minmax(0, 1fr))'"
               [style.transform]="'translateY(' + (row.start - rowVirtualizer.options().scrollMargin) + 'px)'">
            @for (item of rowItems; track $index; ) {
              @if (item.isSkeleton) {
                <ng-container *ngTemplateOutlet="skeleton()"></ng-container>
              } @else {
                <ng-container *ngTemplateOutlet="body(); context: { $implicit: item.data }"></ng-container>
              }
            }
          </div>
        }
      </div>
    }
  `,
})
export class VirtualizedGrid {
  protected layoutService = inject(LayoutService)

  skeleton = contentChild<TemplateRef<unknown>>('skeleton')
  error = contentChild<TemplateRef<unknown>>('error')
  empty = contentChild<TemplateRef<unknown>>('empty')
  body = contentChild.required<TemplateRef<unknown>>('body')

  items = input.required<unknown[]>()
  isLoading = input<boolean>(false)
  isError = input<boolean>(false)
  isInfiniteScroll = input(false, { transform: booleanAttribute })
  isFetchingNext = input<boolean>()
  pageSize = input<number>(20)
  gap = input<number>(16)
  estimateHeight = input<number>(400)
  columnConfig = input<ColumnConfig>(1)

  onLoadMore = output<void | Promise<void>>()

  protected $container = viewChild<ElementRef<HTMLDivElement>>('container')
  protected $virtualItems =
    viewChildren<ElementRef<HTMLDivElement>>('virtualItem')

  protected $scrollMargin = signal(0)

  private checkScrollMargin = effect(() => {
    const container = this.$container()
    if (!container) {
      return
    }
    const int = setTimeout(() => {
      this.$scrollMargin.set(container.nativeElement.offsetTop)
    }, 100)
    return () => clearInterval(int)
  })

  protected $columns = computed(() => {
    const columnConfig = this.columnConfig()
    if (typeof columnConfig === 'number') {
      return columnConfig
    }
    const size = this.layoutService.$screenSize()
    if (columnConfig) {
      return columnConfig[size] ?? columnConfig.xl ?? 1
    }
    return 1
  })

  protected $skeletonItems = computed(() => {
    const count = this.pageSize()
    return Array.from({ length: count }, (_, i) => i)
  })

  // group items into rows by column count
  protected $rows = computed(() => {
    const columns = this.$columns()
    const data = this.items()
    const isFetching = this.isFetchingNext()

    if (data.length === 0) {
      return []
    }

    const rows: VirtualGridItem[][] = []
    for (let i = 0; i < data.length; i += columns) {
      rows.push(
        data.slice(i, i + columns).map((item) => {
          return {
            isSkeleton: false,
            data: item,
          }
        })
      )
    }

    if (isFetching) {
      const lastRow = rows.at(-1)
      if (lastRow) {
        const toAdd = columns - lastRow.length
        for (let i = 0; i < toAdd; i++) {
          lastRow.push({
            isSkeleton: true,
          })
        }
      }
      const pageSize = this.pageSize()
      for (let i = 0; i < pageSize; i += columns) {
        rows.push(
          data.slice(i, i + columns).map((_) => {
            return {
              isSkeleton: true,
            }
          })
        )
      }
    }

    return rows
  })

  rowVirtualizer = injectWindowVirtualizer(() => {
    return {
      count: this.$rows().length,
      estimateSize: () => this.estimateHeight(),
      gap: this.gap(),
      scrollMargin: this.$scrollMargin(),
    }
  })

  private measureItems = effect(() => {
    this.$virtualItems().forEach((el: ElementRef<HTMLDivElement>) => {
      this.rowVirtualizer.measureElement(el.nativeElement)
    })
  })

  private $fetchedNext = signal(false)

  private fetchNextPage = effect(() => {
    if (!this.isInfiniteScroll() || this.isFetchingNext()) {
      return
    }

    const lastItem =
      this.rowVirtualizer.getVirtualItems()[
        this.rowVirtualizer.getVirtualItems().length - 1
      ]

    if (!lastItem) {
      return
    }

    if (lastItem.index >= this.$rows().length - 1 && !this.$fetchedNext()) {
      this.$fetchedNext.set(true)
      this.onLoadMore.emit()

      // throttle for a little bit
      setTimeout(() => {
        this.$fetchedNext.set(false)
      }, 100)
    }
  })

  protected getRowItems(rowIndex: number): VirtualGridItem[] {
    return this.$rows()[rowIndex] || []
  }
}
