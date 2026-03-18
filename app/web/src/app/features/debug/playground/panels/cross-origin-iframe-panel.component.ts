import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { DomSanitizer } from '@angular/platform-browser'
import { InputText } from 'primeng/inputtext'
import { Select } from 'primeng/select'

import { DebugPanelComponent } from './debug-panel.component'

interface UrlPreset {
  label: string
  url: string
}

@Component({
  selector: 'da-cross-origin-iframe-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DebugPanelComponent, Select, InputText, FormsModule],
  template: `
    <da-debug-panel title="Cross-Origin Iframe" (remove)="remove.emit()" class="block h-full">
      <div toolbar class="flex items-center gap-2 px-3 py-2 border-b border-surface">
        <p-select
          [options]="presets"
          optionLabel="label"
          optionValue="url"
          placeholder="Presets"
          [ngModel]="$url()"
          (ngModelChange)="$url.set($event)"
          size="small"
          class="flex-shrink-0"
        />
        <input
          pInputText
          [ngModel]="$url()"
          (ngModelChange)="$url.set($event)"
          placeholder="Enter URL..."
          class="flex-1 text-sm"
        />
      </div>
      <iframe
        [src]="$sanitizedUrl()"
        class="size-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </da-debug-panel>
  `,
})
export class CrossOriginIframePanelComponent {
  private readonly domSanitizer = inject(DomSanitizer)

  protected readonly presets: UrlPreset[] = [
    {
      label: 'YouTube Embed',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    },
    {
      label: 'Vimeo Embed',
      url: 'https://player.vimeo.com/video/148751763',
    },
    {
      label: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Main_Page',
    },
  ]

  protected readonly $url = signal(this.presets[0].url)

  protected readonly $sanitizedUrl = computed(() => {
    const value = this.$url()
    try {
      const url = new URL(value)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return this.domSanitizer.bypassSecurityTrustResourceUrl(value)
      }
    } catch {
      // invalid URL
    }
    return this.domSanitizer.bypassSecurityTrustResourceUrl('about:blank')
  })

  readonly remove = output()
}
