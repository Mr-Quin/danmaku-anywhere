import { injectable } from 'inversify'

@injectable('Singleton')
export class PageVisibilityService {
  private listeners: Set<(visible: boolean) => void> = new Set()

  constructor() {
    document.addEventListener('visibilitychange', () => {
      this.notifyListeners()
    })
  }

  public get isVisible(): boolean {
    return !document.hidden
  }

  public onVisibilityChange(listener: (visible: boolean) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    const visible = this.isVisible
    this.listeners.forEach((listener) => listener(visible))
  }
}
