import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function run(command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  child.on('exit', (code) => {
    process.exitCode = code ?? 0
  })
  return child
}

const server = run('pnpm', ['exec', 'tsx', 'watch', 'src/server/index.ts'])
const web = run('pnpm', ['exec', 'vite'])

function shutdown() {
  server.kill()
  web.kill()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
