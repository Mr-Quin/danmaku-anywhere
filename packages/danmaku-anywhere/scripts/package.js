import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import packageJson from '../package.json' with { type: 'json' }

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const packageName = packageJson.name.replace(/@.*?\//, '') // Removing scope if present
const packageVersion = packageJson.version

const buildPath = path.resolve(__dirname, '../build')
const packagePath = path.resolve(__dirname, '../package')

// create package folder
await fs.promises.mkdir(packagePath, { recursive: true })

const target = process.env.VITE_TARGET_BROWSER || 'chrome'

const tarFileName = `${packageName}-${packageVersion}-${target}.tar.gz`
const zipFileName = `${packageName}-${packageVersion}-${target}.zip`

// delete existing package files if name matches
const files = await fs.promises.readdir(packagePath)
for (const file of files) {
  if (file.startsWith(`${packageName}-${packageVersion}-${target}`)) {
    await fs.promises.unlink(path.resolve(packagePath, file))
  }
}

exec(
  `tar -czf ${packagePath}/${tarFileName} -C ${buildPath} ./ --xform s:'^./'::`,
  (error) => {
    if (error) {
      console.error('Error occurred:', error)
      return
    }
    console.log(`Package created: ${packagePath}/${tarFileName}`)
  }
)

exec(`cd ${buildPath} && zip -r ${packagePath}/${zipFileName} ./`, (error) => {
  if (error) {
    console.error('Error occurred:', error)
    return
  }
  console.log(`Package created: ${packagePath}/${zipFileName}`)
})
