import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'

@Component({
  selector: 'da-iframe-debug-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="size-full border-1">
      <iframe
        [src]="iframeSrc"
        class="size-full"
      ></iframe>
    </div>
  `,
})
export class IframeDebugPageComponent {
  private readonly domSanitizer = inject(DomSanitizer)
  protected readonly iframeSrc =
    this.domSanitizer.bypassSecurityTrustResourceUrl(window.location.origin)
}
