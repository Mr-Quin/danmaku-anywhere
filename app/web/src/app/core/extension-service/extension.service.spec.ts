import { TestBed } from '@angular/core/testing'

import { ExtensionService } from './extension.service'

describe('ExtensionMessage', () => {
  let service: ExtensionService

  beforeEach(() => {
    TestBed.configureTestingModule({})
    service = TestBed.inject(ExtensionService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
