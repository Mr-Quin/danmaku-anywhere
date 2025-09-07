import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

@Component({
  selector: 'da-kazumi-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <div class="container mx-auto px-6 py-4">
      <main class="h-full">
        <router-outlet />
      </main>
    </div>
  `,
})
export class KazumiLayout {}
