function fmt(level: string, message: unknown, extra?: unknown): string {
  const ts = new Date().toISOString()
  const base = `[${ts}] ${level.toUpperCase()}: ${String(message)}`
  if (extra === undefined) return base
  if (extra instanceof Error) return `${base} (${extra.message})`
  try {
    return `${base} ${JSON.stringify(extra)}`
  } catch {
    return base
  }
}

export type Logger = {
  debug: (message: unknown, extra?: unknown) => void
  info: (message: unknown, extra?: unknown) => void
  warn: (message: unknown, extra?: unknown) => void
  error: (message: unknown, extra?: unknown) => void
}

export function createLogger({ debug = false }: { debug?: boolean } = {}): Logger {
  return {
    debug: (message, extra) => {
      if (!debug) return
      console.log(fmt('debug', message, extra))
    },
    info: (message, extra) => console.log(fmt('info', message, extra)),
    warn: (message, extra) => console.warn(fmt('warn', message, extra)),
    error: (message, extra) => console.error(fmt('error', message, extra))
  }
}

