import { type ComponentFixture, TestBed } from '@angular/core/testing'

import { VideoPlayer } from './video-player'

describe('VideoPlayer', () => {
  let component: VideoPlayer
  let fixture: ComponentFixture<VideoPlayer>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoPlayer],
    }).compileComponents()

    fixture = TestBed.createComponent(VideoPlayer)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
