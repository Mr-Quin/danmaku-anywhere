import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { PrivacyPolicyDialog } from './privacy-policy-dialog'

@Component({
  selector: 'da-app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrivacyPolicyDialog],
  template: `
    <footer class="py-4 px-6">
      <div
        class="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-surface-500">
        <div class="flex flex-col sm:flex-row items-center gap-4 ">
          <button
            class="hover:text-primary transition-colors cursor-pointer"
            (click)="$showPrivacyDialog.set(true)">
            隐私政策
          </button>
        </div>
        <div>
          © {{ currentYear }} Danmaku Anywhere
        </div>
      </div>
    </footer>

    <da-privacy-policy-dialog
      [visible]="$showPrivacyDialog()"
      (visibleChange)="$showPrivacyDialog.set($event)" />
  `,
})
export class AppFooter {
  protected $showPrivacyDialog = signal(false)
  protected currentYear = new Date().getFullYear()
}
