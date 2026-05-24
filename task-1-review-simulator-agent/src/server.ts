import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './config.js'
import { createLogger } from './logger.js'
import { createPineconeClient } from './services/pinecone.js'
import { createGroqClient } from './services/groq.js'
import { createApiRouter } from './routes/api.js'
import cors from "cors"

const app = express()

app.use(express.json())
app.use(cors())

const config = loadConfig()
const log = createLogger({ debug: config.logging.debug })

const index = createPineconeClient({
  apiKey: config.pinecone.apiKey,
  indexName: config.pinecone.index
})

const groq = createGroqClient({ apiKey: config.groq.apiKey })

const api = createApiRouter({
  index: index as any,
  groq,
  groqModel: config.groq.model,
  log
})


app.use('/api', api)

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../../client/dist')

app.use(express.static(clientDist))

app.get(/^\/(?!api|health).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(config.port, () => log.info(`Server listening on port ${config.port}`))
