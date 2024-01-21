import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import pkg from 'fs-extra'

const { emptyDir } = pkg

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'))
)

const packageName = packageJson.name.replace(/@.*?\//, '') // Removing scope if present
const packageVersion = packageJson.version

const tarFileName = `${packageName}-${packageVersion}.tar.gz`

const buildPath = path.resolve(__dirname, '../build')
const packagePath = path.resolve(__dirname, '../package')
const packageFileName = path.resolve(__dirname, '../package', tarFileName)

// create package folder
await fs.promises.mkdir(packagePath, { recursive: true })

// empty package folder
await emptyDir(packagePath)

exec(`tar -czf ${packageFileName} -C ${buildPath} .`, (error) => {
  if (error) {
    console.error('Error occurred:', error)
    return
  }
  console.log(`Package created: ${packagePath}`)
})
