const INTRO_MS = 3000

/**
 * Whether the panel is showing: for a few seconds after it gets something to
 * show, and otherwise while the pointer is active over the video. Without the
 * intro, content that arrives after the player has gone idle would never be
 * seen.
 */
export class PanelVisibility {
  private intro = false
  private hasContent = false
  private visible: boolean
  private timeoutId?: ReturnType<typeof setTimeout>

  constructor(
    private idleActive: boolean,
    private readonly onChange: (visible: boolean) => void,
    private readonly introMs = INTRO_MS
  ) {
    this.visible = idleActive
  }

  isVisible(): boolean {
    return this.visible
  }

  setIdleActive(active: boolean): void {
    this.idleActive = active
    this.update()
  }

  setHasContent(hasContent: boolean): void {
    if (hasContent === this.hasContent) {
      return
    }
    this.hasContent = hasContent
    clearTimeout(this.timeoutId)
    this.intro = hasContent
    if (hasContent) {
      this.timeoutId = setTimeout(() => {
        this.intro = false
        this.update()
      }, this.introMs)
    }
    this.update()
  }

  private update(): void {
    const visible = this.intro || this.idleActive
    if (visible === this.visible) {
      return
    }
    this.visible = visible
    this.onChange(visible)
  }
}
