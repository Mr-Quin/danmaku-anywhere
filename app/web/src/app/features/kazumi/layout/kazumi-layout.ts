import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

@Component({
  selector: 'da-kazumi-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  host: {
    class: 'h-full block',
  },
  template: `
    <div class="container mx-auto">
      <main class="h-full">
        <router-outlet />
      </main>
    </div>
  `,
})
export class KazumiLayout {}
