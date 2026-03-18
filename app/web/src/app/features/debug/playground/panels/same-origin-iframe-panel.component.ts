import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'

import { DebugPanelComponent } from './debug-panel.component'

@Component({
  selector: 'da-same-origin-iframe-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DebugPanelComponent],
  template: `
    <da-debug-panel title="Same-Origin Iframe" (remove)="remove.emit()" class="block h-full">
      <iframe
        [src]="iframeSrc"
        class="size-full border-0"
      ></iframe>
    </da-debug-panel>
  `,
})
export class SameOriginIframePanelComponent {
  private readonly domSanitizer = inject(DomSanitizer)

  protected readonly iframeSrc =
    this.domSanitizer.bypassSecurityTrustResourceUrl(
      `${window.location.origin}/local`
    )

  readonly remove = output()
}
