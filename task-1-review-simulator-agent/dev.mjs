import { spawn } from 'node:child_process'
import process from 'node:process'

function bin(name) {
  return new URL(`./node_modules/.bin/${name}`, import.meta.url).pathname
}

const procs = []

function start(cmd, args, label) {
  const child = spawn(cmd, args, { stdio: 'inherit' })
  child.on('exit', (code, signal) => {
    if (signal) return
    if (code && code !== 0) {
      console.error(`[dev] ${label} exited with code ${code}`)
      shutdown(code)
    }
  })
  procs.push(child)
}

function shutdown(code = 0) {
  for (const p of procs) {
    try { p.kill('SIGTERM') } catch {}
  }
  process.exitCode = code
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start(bin('tsc'), ['-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'], 'tsc')
start(bin('nodemon'), [], 'nodemon')

