# Column-body wrapper + registry pattern

Each lane column kind renders a feature body through a thin per-kind **wrapper**
component. The wrapper is the only place that injects `LaneStore`; the feature
body stays store-free and router-free, emitting outputs that the wrapper
translates into store ops. This keeps feature bodies reusable and testable in
isolation, and keeps the wiring file (`registry.ts`) contention-free so several
agents can each add one kind in parallel.

## Files per kind

Add one file `columns/<kind>-column.ts` exporting `<Kind>Column`
(selector `da-<kind>-column`). Then add a single entry to
`columns/registry.ts`.

## Wrapper shape

```ts
@Component({
  selector: 'da-trending-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrendingPage],
  host: {
    'data-testid': 'column-body',
    'data-kind': 'trending',
  },
  template: `
    <da-trending-page
      (openDetails)="onOpenDetails($event)"
      (openWatch)="onOpenWatch($event)"
    />
  `,
})
export class TrendingColumn {
  readonly col = input.required<Column>()
  private readonly store = inject(LaneStore)

  onOpenDetails(item: ShowCardData) {
    this.store.openDetails(item.id, item.title ?? item.altTitle)
  }
}
```

Rules:

- **`col = input.required<Column>()`** is always present; pass any params the
  body needs as inputs derived from `col()` (narrow the discriminated union by
  `col().kind` first).
- **`host` sets `data-testid="column-body"` and `data-kind`** so e2e and the
  shell can find the rendered body root. Use a static `data-kind` when the
  wrapper is single-kind, or `'[attr.data-kind]': 'col().kind'` for the
  placeholder.
- **Only the wrapper injects `LaneStore`.** Bodies emit outputs; the wrapper
  maps them to ops. Standard mappings:
  - `openDetails(item)` -> `store.openDetails(item.id, item.title ?? item.altTitle)`
  - `openWatch(item)` -> `store.openWatch({ subjectId: item.id, title: item.title ?? item.altTitle })`

## Registry

```ts
export const COLUMN_REGISTRY: Partial<Record<ColumnKind, Type<unknown>>> = {
  trending: TrendingColumn,
  calendar: CalendarColumn,
}
```

`ColumnBodyHost` renders `NgComponentOutlet` from this map and falls back to
`PlaceholderColumn` for unmapped kinds. Adding a kind = one import + one entry.
Keep it a flat literal so merges from parallel branches never conflict beyond
the single new line.

## Card test ids

`ShowCard` carries `data-testid="show-card"` and `data-subject-id` on its host,
so any body rendering cards is e2e-addressable without per-body wiring.

## Focus on open

The `LaneShell` watches `laneStore.columns()` and focuses (scroll + setActive)
any newly-appended column id. Body-initiated opens therefore scroll the lane
automatically; the wrapper does not need to do anything beyond calling the
store op. Dedupe-focus opens (which return an existing id and append nothing)
are handled by the explicit `focusColumn` paths.
