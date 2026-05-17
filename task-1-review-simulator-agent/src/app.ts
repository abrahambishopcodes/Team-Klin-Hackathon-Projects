import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

export function createApp({ api, staticDir = 'public', viewsDir = 'views' }: { api: express.Router; staticDir?: string; viewsDir?: string }) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', api)

  app.set('view engine', 'ejs')
  app.set('views', path.join(__dirname, '..', viewsDir))
  app.use(express.static(path.join(__dirname, '..', staticDir)))

  app.get('/', (req, res) => res.render('index'))

  return app
}

