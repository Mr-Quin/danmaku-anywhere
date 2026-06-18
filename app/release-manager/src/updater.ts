import { relaunch } from '@tauri-apps/plugin-process'
import type { Update } from '@tauri-apps/plugin-updater'
import { check } from '@tauri-apps/plugin-updater'

export type { Update }

export async function checkForUpdate(): Promise<Update | null> {
  return check()
}

export async function installUpdate(update: Update): Promise<void> {
  await update.downloadAndInstall()
}

export async function relaunchApp(): Promise<void> {
  await relaunch()
}
