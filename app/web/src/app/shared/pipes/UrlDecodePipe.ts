import { Pipe } from '@angular/core'

function unescapeString(str: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(str, 'text/html')
  return doc.body.textContent
}

@Pipe({
  name: 'unescape',
})
export class UnescapePipePipe {
  transform(value: string) {
    return unescapeString(value)
  }
}
