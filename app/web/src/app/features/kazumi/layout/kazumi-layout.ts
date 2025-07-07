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
import { Dialog } from 'primeng/dialog'
import { filter, map, switchMap } from 'rxjs'
import { MaterialIcon } from '../../../shared/components/material-icon'
import { KazumiPolicyImportDialog } from '../components/kazumi-policy-import-dialog'
import { KazumiPolicyManage } from '../components/kazumi-policy-manage'
import { KazumiService } from '../services/kazumi.service'
import { KazumiLayoutService } from '../services/kazumi-layout.service'

@Component({
  selector: 'da-kazumi-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    Button,
    MaterialIcon,
    RouterLink,
    Dialog,
    KazumiPolicyManage,
    KazumiPolicyImportDialog,
  ],
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
          <p-button
            severity="secondary"
            label="管理规则"
            text
            (onClick)="kazumiLayoutService.$showManageDialog.set(true)"
            [badge]="kazumiService.$hasOutdatedPolicy() ? ' ' : ''"
            badgeSeverity="warn"
          >
          </p-button>
        }
      </div>
      <main class="h-full">
        <router-outlet />
      </main>
      <p-dialog header="规则列表" [(visible)]="kazumiLayoutService.$showManageDialog" dismissableMask="true"
                modal="true"
                maskStyleClass="backdrop-blur-sm">
        <da-kazumi-policy-manage
          (openImport)="kazumiLayoutService.$showImportDialog.set(true)"></da-kazumi-policy-manage>
      </p-dialog>
      <da-kazumi-policy-import-dialog
        [(visible)]="kazumiLayoutService.$showImportDialog"></da-kazumi-policy-import-dialog>
    </div>
  `,
})
export class KazumiLayout {
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  protected kazumiService = inject(KazumiService)
  protected kazumiLayoutService = inject(KazumiLayoutService)

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
