import { Component } from '@angular/core'

import { Layout } from './layout/components/layout'

@Component({
  selector: 'app-root',
  imports: [Layout],
  template: `
    <da-app-layout></da-app-layout>
  `,
})
export class App {}
