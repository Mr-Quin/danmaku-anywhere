import fs from 'node:fs'
import path from 'node:path'

const buildPath = path.resolve(import.meta.dirname, '../build')
const viteCacheDir = path.resolve(buildPath, '.vite')

async function removeViteDir() {
  try {
    const stat = await fs.promises.stat(viteCacheDir)
    if (!stat) {
      console.log('.vite cache not found, nothing to remove.')
      return
    }
    if (!stat.isDirectory()) {
      console.warn(
        `Expected directory at ${viteCacheDir}, found non-directory. Skipping.`
      )
      return
    }
    await fs.promises.rm(viteCacheDir, { force: true, recursive: true })
    console.log(`Removed ${viteCacheDir}`)
  } catch (error) {
    console.error('Failed to remove .vite directory:', error)
    process.exitCode = 1
  }
}

await removeViteDir()
