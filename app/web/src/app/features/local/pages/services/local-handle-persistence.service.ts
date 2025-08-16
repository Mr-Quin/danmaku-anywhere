import { Injectable } from '@angular/core'

const DB_NAME = 'da-local-player'
const STORE_NAME = 'handles'
const KEY_DIR = 'directory'

@Injectable({ providedIn: 'root' })
export class LocalHandlePersistenceService {
  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await this.openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(handle, KEY_DIR)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    db.close()
  }

  async getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    const db = await this.openDb()
    const handle = await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(KEY_DIR)
        req.onsuccess = () =>
          resolve((req.result as FileSystemDirectoryHandle) ?? null)
        req.onerror = () => reject(req.error)
      }
    )
    db.close()
    return handle
  }

  async clearDirectoryHandle(): Promise<void> {
    const db = await this.openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(KEY_DIR)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    db.close()
  }
}
