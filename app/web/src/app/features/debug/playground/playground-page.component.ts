import { ChangeDetectionStrategy, Component, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Button } from 'primeng/button'
import { Select } from 'primeng/select'

import { CrossOriginIframePanelComponent } from './panels/cross-origin-iframe-panel.component'
import { NativeVideoPanelComponent } from './panels/native-video-panel.component'
import { SameOriginIframePanelComponent } from './panels/same-origin-iframe-panel.component'

type PanelType = 'same-origin-iframe' | 'cross-origin-iframe' | 'native-video'

interface DebugPanel {
  id: string
  type: PanelType
}

interface PanelTypeOption {
  label: string
  value: PanelType
}

@Component({
  selector: 'da-playground-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Button,
    Select,
    FormsModule,
    SameOriginIframePanelComponent,
    CrossOriginIframePanelComponent,
    NativeVideoPanelComponent,
  ],
  template: `
    <div class="flex flex-col gap-4 p-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-semibold">Playground</h1>
        <div class="flex items-center gap-2 ml-auto">
          <p-select
            [options]="panelTypeOptions"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="$selectedType"
            size="small"
          />
          <p-button
            label="Add Panel"
            icon="pi pi-plus"
            size="small"
            (onClick)="addPanel()"
          />
          @if ($panels().length > 0) {
            <p-button
              label="Clear All"
              icon="pi pi-trash"
              size="small"
              severity="danger"
              [outlined]="true"
              (onClick)="clearAll()"
            />
          }
        </div>
      </div>

      @if ($panels().length === 0) {
        <div class="flex items-center justify-center h-64 text-surface-500">
          <p>Add a panel to get started</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          @for (panel of $panels(); track panel.id) {
            <div class="min-h-[400px]">
              @switch (panel.type) {
                @case ('same-origin-iframe') {
                  <da-same-origin-iframe-panel
                    class="block h-full"
                    (remove)="removePanel(panel.id)"
                  />
                }
                @case ('cross-origin-iframe') {
                  <da-cross-origin-iframe-panel
                    class="block h-full"
                    (remove)="removePanel(panel.id)"
                  />
                }
                @case ('native-video') {
                  <da-native-video-panel
                    class="block h-full"
                    (remove)="removePanel(panel.id)"
                  />
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PlaygroundPageComponent {
  protected readonly panelTypeOptions: PanelTypeOption[] = [
    { label: 'Same-Origin Iframe', value: 'same-origin-iframe' },
    { label: 'Cross-Origin Iframe', value: 'cross-origin-iframe' },
    { label: 'Native Video', value: 'native-video' },
  ]

  protected readonly $selectedType = signal<PanelType>('same-origin-iframe')
  protected readonly $panels = signal<DebugPanel[]>([
    { id: crypto.randomUUID(), type: 'native-video' },
  ])

  protected addPanel() {
    const panel: DebugPanel = {
      id: crypto.randomUUID(),
      type: this.$selectedType(),
    }
    this.$panels.update((panels) => [...panels, panel])
  }

  protected removePanel(id: string) {
    this.$panels.update((panels) => panels.filter((p) => p.id !== id))
  }

  protected clearAll() {
    this.$panels.set([])
  }
}
