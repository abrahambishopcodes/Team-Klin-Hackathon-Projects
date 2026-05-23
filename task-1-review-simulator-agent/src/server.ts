import express from 'express'
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


app.listen(config.port, () => log.info(`Server listening on port ${config.port}`))
