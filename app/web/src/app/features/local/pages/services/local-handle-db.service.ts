import { Injectable } from '@angular/core'
import Dexie, { type Table } from 'dexie'

const DB_NAME = 'da-local-player'
const STORE_NAME = 'handles'

interface HandleSetting {
  handle: FileSystemDirectoryHandle
  key: string
}

class LocalPlayerDb extends Dexie {
  handles!: Table<HandleSetting, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      [STORE_NAME]: '&key',
    })
    this.handles = this.table(STORE_NAME)
  }

  async setHandle(key: string, handle: FileSystemDirectoryHandle) {
    return this.handles.put({ key, handle })
  }

  async getAllHandles(): Promise<HandleSetting[]> {
    return this.handles.toArray()
  }

  async removeHandle(key: string): Promise<void> {
    return this.handles.delete(key)
  }

  async hasHandle(handle: FileSystemDirectoryHandle): Promise<boolean> {
    const existing = await this.getAllHandles()
    for (const setting of existing) {
      if (await setting.handle.isSameEntry(handle)) {
        return true
      }
    }
    return false
  }
}

@Injectable({ providedIn: 'root' })
export class LocalHandleDbService {
  private readonly db = new LocalPlayerDb()

  async saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const key = crypto.randomUUID()
    if (await this.db.hasHandle(handle)) {
      throw new Error(`${handle} already exists`)
    }
    await this.db.setHandle(key, handle)
  }

  async removeHandle(key: string): Promise<void> {
    await this.db.removeHandle(key)
  }

  async getAllHandles(): Promise<HandleSetting[]> {
    return this.db.getAllHandles()
  }
}
