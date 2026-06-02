import { TestBed } from '@angular/core/testing'

import { ExtensionService } from './extension.service'

/**
 * Verifies the real ExtensionService still constructs after it became the
 * concrete ExtensionDetector implementation (no longer providedIn root). It is
 * provided explicitly here, mirroring how the backend seam binds it in the app.
 */
describe('ExtensionService', () => {
  let service: ExtensionService

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExtensionService],
    })
    service = TestBed.inject(ExtensionService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
