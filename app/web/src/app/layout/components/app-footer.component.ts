import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { PrivacyPolicyDialog } from '../../shared/components/privacy-policy-dialog'

@Component({
  selector: 'da-app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrivacyPolicyDialog],
  template: `
    <footer class="py-4 px-6">
      <div
        class="max-w-6xl mx-auto flex justify-center gap-4 text-sm text-gray-600">
        <button
          class="hover:text-primary transition-colors cursor-pointer"
          (click)="$showPrivacyDialog.set(true)">
          隐私政策
        </button>
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
