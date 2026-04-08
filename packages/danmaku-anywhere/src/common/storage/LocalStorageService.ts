const NAMESPACE = 'danmaku-anywhere:'

/**
 * Typed wrapper around localStorage with namespaced keys.
 * Analogous to ExtStorageService but for synchronous localStorage access.
 */
export class LocalStorageService<T> {
  private namespacedKey: string

  constructor(key: string) {
    this.namespacedKey = `${NAMESPACE}${key}`
  }

  read(): T | undefined {
    try {
      const raw = localStorage.getItem(this.namespacedKey)
      if (raw === null) {
        return undefined
      }
      return JSON.parse(raw) as T
    } catch {
      return undefined
    }
  }

  write(value: T): void {
    try {
      localStorage.setItem(this.namespacedKey, JSON.stringify(value))
    } catch {
      // ignore quota errors
    }
  }

  remove(): void {
    try {
      localStorage.removeItem(this.namespacedKey)
    } catch {
      // ignore
    }
  }
}
