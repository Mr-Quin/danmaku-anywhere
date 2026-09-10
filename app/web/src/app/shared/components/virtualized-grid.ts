import { CommonModule, isPlatformBrowser } from '@angular/common'
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  viewChild,
  viewChildren,
} from '@angular/core'
import {
  injectVirtualizer,
  injectWindowVirtualizer,
} from '@tanstack/angular-virtual'
import { LayoutService, type ScreenSize } from '../../layout/layout.service'

export type VirtualGridItem =
  | {
      isSkeleton: true
    }
  | {
      isSkeleton: false
      data: unknown
      index: number
    }

export type ColumnConfig = number | Partial<Record<ScreenSize, number>>

function findScrollAncestor(start: Element | null): Element | null {
  let el = start?.parentElement ?? null
  while (el) {
    if (el.hasAttribute('data-colscroll')) {
      return el
    }
    el = el.parentElement
  }
  el = start?.parentElement ?? null
  while (el) {
    const overflowY = getComputedStyle(el).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return el
    }
    el = el.parentElement
  }
  return null
}

@Component({
  selector: 'da-virtualized-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div #root class="w-full">
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
                <ng-container *ngTemplateOutlet="body(); context: { $implicit: item.data, index: item.index }"></ng-container>
              }
            }
          </div>
        }
      </div>
    }
    </div>
  `,
})
export class VirtualizedGrid {
  protected layoutService = inject(LayoutService)
  private readonly platformId = inject(PLATFORM_ID)
  private readonly destroyRef = inject(DestroyRef)
  private readonly isBrowser = isPlatformBrowser(this.platformId)

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
  columnConfig = input<ColumnConfig>()
  minColumnWidth = input(180, { transform: numberAttribute })
  windowVirtualizer = input(false, { transform: booleanAttribute })
  scrollElement = input<ElementRef<Element>>()

  onLoadMore = output<void | Promise<void>>()

  protected $root = viewChild.required<ElementRef<HTMLDivElement>>('root')
  protected $container = viewChild<ElementRef<HTMLDivElement>>('container')
  protected $virtualItems =
    viewChildren<ElementRef<HTMLDivElement>>('virtualItem')

  protected $scrollMargin = signal(0)
  private $containerWidth = signal(0)
  private $resolvedScrollElement = signal<Element | null>(null)

  protected $columns = computed(() => {
    const columnConfig = this.columnConfig()
    // an explicit config is a lock; callers that want fluid width-based
    // columns leave it unset and rely on minColumnWidth instead
    if (typeof columnConfig === 'number') {
      return columnConfig
    }
    if (columnConfig) {
      const size = this.layoutService.$screenSize()
      return columnConfig[size] ?? columnConfig.xl ?? 1
    }
    const width = this.$containerWidth()
    const minWidth = this.minColumnWidth()
    if (width > 0 && minWidth > 0) {
      return Math.max(1, Math.floor(width / minWidth))
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
        data.slice(i, i + columns).map((item, offset) => {
          return {
            isSkeleton: false,
            data: item,
            index: i + offset,
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

  private $scrollElementForVirtualizer = computed(() => {
    const provided = this.scrollElement()
    if (provided) {
      return provided
    }
    return this.$resolvedScrollElement() ?? undefined
  })

  rowWindowVirtualizer = injectWindowVirtualizer(() => {
    return {
      enabled: this.windowVirtualizer(),
      count: this.$rows().length,
      estimateSize: () => this.estimateHeight(),
      gap: this.gap(),
      scrollMargin: this.$scrollMargin(),
    }
  })

  rowNormalVirtualizer = injectVirtualizer(() => {
    return {
      enabled: !this.windowVirtualizer(),
      scrollElement: this.$scrollElementForVirtualizer(),
      count: this.$rows().length,
      estimateSize: () => this.estimateHeight(),
      gap: this.gap(),
      scrollMargin: this.$scrollMargin(),
    }
  })

  get rowVirtualizer() {
    return this.windowVirtualizer()
      ? this.rowWindowVirtualizer
      : this.rowNormalVirtualizer
  }

  private $loadMoreArmed = signal(true)
  private lastItemCount = 0
  private readonly loadMoreThreshold = 300

  constructor() {
    afterNextRender(() => {
      if (!this.isBrowser) {
        return
      }
      const rootEl = this.$root().nativeElement
      this.$containerWidth.set(rootEl.clientWidth)
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry) {
          this.$containerWidth.set(entry.contentRect.width)
        }
      })
      observer.observe(rootEl)
      this.destroyRef.onDestroy(() => observer.disconnect())

      if (!this.windowVirtualizer() && !this.scrollElement()) {
        this.$resolvedScrollElement.set(findScrollAncestor(rootEl))
      }

      this.attachLoadMoreListener()
    })

    // window virtualizer needs the offset of the grid within the page
    effect(() => {
      const container = this.$container()
      if (!container || !this.windowVirtualizer()) {
        return
      }
      const int = setTimeout(() => {
        this.$scrollMargin.set(container.nativeElement.offsetTop)
      }, 100)
      return () => clearTimeout(int)
    })

    // measure items
    effect(() => {
      this.$virtualItems().forEach((el: ElementRef<HTMLDivElement>) => {
        this.rowVirtualizer.measureElement(el.nativeElement)
      })
    })

    // re-arm load-more only when a new page of items actually arrived, then
    // top up if the content still does not fill the scroll container
    effect(() => {
      const count = this.items().length
      if (count > this.lastItemCount) {
        this.lastItemCount = count
        this.$loadMoreArmed.set(true)
        if (this.isInfiniteScroll() && !this.isFetchingNext()) {
          this.maybeLoadMore()
        }
      }
    })
  }

  private attachLoadMoreListener(): void {
    const provided = this.scrollElement()?.nativeElement
    const target: Element | Window =
      provided ?? this.$resolvedScrollElement() ?? window
    const onScroll = () => {
      if (this.isInfiniteScroll()) {
        this.maybeLoadMore()
      }
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    this.destroyRef.onDestroy(() => {
      target.removeEventListener('scroll', onScroll)
    })
  }

  private nearBottom(): boolean {
    const provided = this.scrollElement()?.nativeElement
    const el = provided ?? this.$resolvedScrollElement()
    if (el) {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
      return remaining <= this.loadMoreThreshold
    }
    if (!this.isBrowser) {
      return false
    }
    const doc = document.documentElement
    const remaining = doc.scrollHeight - window.scrollY - window.innerHeight
    return remaining <= this.loadMoreThreshold
  }

  private maybeLoadMore(): void {
    if (
      !this.isInfiniteScroll() ||
      this.isFetchingNext() ||
      !this.$loadMoreArmed()
    ) {
      return
    }
    if (this.items().length === 0) {
      return
    }
    if (this.nearBottom()) {
      this.$loadMoreArmed.set(false)
      this.onLoadMore.emit()
    }
  }

  protected getRowItems(rowIndex: number): VirtualGridItem[] {
    return this.$rows()[rowIndex] || []
  }
}
