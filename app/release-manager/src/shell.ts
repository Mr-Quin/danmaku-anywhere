import { revealItemInDir } from '@tauri-apps/plugin-opener'

export async function openFolder(path: string): Promise<void> {
  await revealItemInDir(path)
}
