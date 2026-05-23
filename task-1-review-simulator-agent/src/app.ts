import express from 'express'
import cors from 'cors'
import path from 'path'

export function createApp({ api, staticDir = 'public', viewsDir = 'views' }: { api: express.Router; staticDir?: string; viewsDir?: string }) {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.use('/api', api)

  app.set('view engine', 'ejs')
  app.set('views', path.resolve(process.cwd(), viewsDir))
  app.use(express.static(path.resolve(process.cwd(), staticDir)))

  app.get('/', (req, res) => res.render('index'))

  return app
}
