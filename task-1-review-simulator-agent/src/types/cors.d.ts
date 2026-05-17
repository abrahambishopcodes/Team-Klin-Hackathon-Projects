declare module 'cors' {
  import type { RequestHandler } from 'express'
  const cors: (...args: any[]) => RequestHandler
  export default cors
}

