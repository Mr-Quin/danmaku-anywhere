import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router'
import { Button } from 'primeng/button'
import { filter, map, switchMap } from 'rxjs'
import { MaterialIcon } from '../../../shared/components/material-icon'

@Component({
  selector: 'da-kazumi-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Button, MaterialIcon, RouterLink],
  host: {
    class: 'h-full block',
  },
  template: `
    <div class="container mx-auto">
      <div class="mb-6 flex justify-between">
        @if ($showBackButton()) {
          <p-button
            severity="secondary"
            label="返回搜索"
            text
            routerLink="/kazumi"
            [queryParamsHandling]="'preserve'"
          >
            <ng-template #icon>
              <da-mat-icon icon="arrow_back" />
            </ng-template>
          </p-button>
        } @else {
          <div></div>
        }
        @if ($showManageButton()) {
          <div></div>
        }
      </div>
      <main class="h-full">
        <router-outlet />
      </main>
    </div>
  `,
})
export class KazumiLayout {
  private router = inject(Router)
  private route = inject(ActivatedRoute)

  private $childRouteData = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.route.firstChild),
      switchMap((route) => route?.data ?? [])
    )
  )

  $showBackButton = computed(() => {
    return this.$childRouteData()?.['showBackButton'] ?? true
  })

  $showManageButton = computed(
    () => this.$childRouteData()?.['showManageButton'] ?? true
  )
}
