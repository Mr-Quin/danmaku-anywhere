import { homedir } from 'node:os'
import { join } from 'node:path'

export function resolveDataDir(): string {
  const fromEnv = process.env.DA_RELEASE_MANAGER_DIR
  if (fromEnv && fromEnv.trim() !== '') {
    return fromEnv
  }
  return join(homedir(), '.da-release-manager')
}
