import { RenderMode, type ServerRoute } from '@angular/ssr'

export const serverRoutes: ServerRoute[] = [
  { path: 'trending', renderMode: RenderMode.Prerender },
  { path: 'local', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
]
