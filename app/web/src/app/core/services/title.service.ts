import { effect, Injectable, inject } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { Title } from '@angular/platform-browser'
import { NavigationEnd, Router } from '@angular/router'
import { filter } from 'rxjs'
import { KazumiService } from '../../features/kazumi/services/kazumi.service'
import { PAGE_TITLE } from '../../shared/constants'

@Injectable({
  providedIn: 'root',
})
export class TitleService {
  private title = inject(Title)
  private router = inject(Router)
  private kazumiService = inject(KazumiService)

  private $navEndEvent = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd))
  )

  constructor() {
    effect(() => {
      const navEvent = this.$navEndEvent()
      if (!navEvent) return

      const route = navEvent.urlAfterRedirects

      // if route has static title, use that
      if (this.getCurrentRoute().title) {
        return
      }

      let title = PAGE_TITLE

      const searchDetails = this.kazumiService.$searchDetails()

      if (route.startsWith('/kazumi')) {
        if (route.includes('search')) {
          title = `Kazumi 搜索 | ${title}`
        }
        // use video title in title
        if (searchDetails) {
          title = `${searchDetails.title} | ${title}`
        }
      }
      this.title.setTitle(title)
    })
  }

  private getCurrentRoute() {
    let route = this.router.routerState.root

    while (route.firstChild) {
      route = route.firstChild
    }

    return route.snapshot
  }
}
