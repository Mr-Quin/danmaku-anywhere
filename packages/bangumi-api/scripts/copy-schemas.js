#!/usr/bin/env node

import { glob } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const srcDir = join(projectRoot, 'src')
const distDir = join(projectRoot, 'dist')

const globAsync = promisify(glob)

async function copySchemas() {
  try {
    // Ensure dist directory exists
    await mkdir(distDir, { recursive: true })

    // Find all schema .d.ts files
    const schemaFiles = await globAsync('schema*.d.ts', { cwd: srcDir })

    if (schemaFiles.length === 0) {
      console.log('No schema files found to copy')
      return
    }

    // Copy each file
    for (const file of schemaFiles) {
      const srcPath = join(srcDir, file)
      const destPath = join(distDir, file)

      await copyFile(srcPath, destPath)
      console.log(`Copied ${file} to dist/`)
    }

    console.log(`Successfully copied ${schemaFiles.length} schema file(s)`)
  } catch (error) {
    console.error('Error copying schema files:', error)
    process.exit(1)
  }
}

copySchemas()
