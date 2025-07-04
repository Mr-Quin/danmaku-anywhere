import { Directive, ElementRef, inject, type OnInit } from '@angular/core'

@Directive({
  selector: '[daExternalLink]',
})
export class ExternalLinkDirective implements OnInit {
  private el = inject(ElementRef)

  ngOnInit(): void {
    const element = this.el.nativeElement
    element.classList.add('underline', 'cursor-pointer')
  }
}
