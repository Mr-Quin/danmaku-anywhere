import {
  ChangeDetectionStrategy,
  Component,
  output,
  signal,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Select } from 'primeng/select'

import { DebugPanelComponent } from './debug-panel.component'

interface VideoOption {
  label: string
  url: string
}

@Component({
  selector: 'da-native-video-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DebugPanelComponent, Select, FormsModule],
  template: `
    <da-debug-panel title="Native Video" (remove)="remove.emit()" class="block h-full">
      <div toolbar class="flex items-center gap-2 px-3 py-2 border-b border-surface">
        <p-select
          [options]="videoOptions"
          optionLabel="label"
          optionValue="url"
          [ngModel]="$videoUrl()"
          (ngModelChange)="$videoUrl.set($event)"
          placeholder="Select video"
          size="small"
          class="flex-1"
        />
      </div>
      <div class="flex-1 min-h-0 flex items-center justify-center bg-black h-full">
        <video
          [src]="$videoUrl()"
          controls
          class="max-w-full max-h-full"
        ></video>
      </div>
    </da-debug-panel>
  `,
})
export class NativeVideoPanelComponent {
  protected readonly videoOptions: VideoOption[] = [
    {
      label: 'Big Buck Bunny',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    },
    {
      label: 'Elephants Dream',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    },
    {
      label: 'For Bigger Blazes',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    },
    {
      label: 'Sintel',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    },
    {
      label: 'Tears of Steel',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    },
  ]

  protected readonly $videoUrl = signal(this.videoOptions[0].url)

  readonly remove = output()
}
