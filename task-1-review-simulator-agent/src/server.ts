import { loadConfig } from './config.js'
import { createLogger } from './logger.js'
import { createPineconeClient } from './services/pinecone.js'
import { createGroqClient } from './services/groq.js'
import { createApiRouter } from './routes/api.js'
import { createApp } from './app.js'

const config = loadConfig()
const log = createLogger({ debug: config.logging.debug })

const index = createPineconeClient({
  apiKey: config.pinecone.apiKey,
  indexName: config.pinecone.index
})

const groq = createGroqClient({ apiKey: config.groq.apiKey })

const api = createApiRouter({
  index: index as any,
  groq: groq as any,
  groqModel: config.groq.model,
  log
})

const app = createApp({ api })
app.listen(config.port, () => log.info(`Server listening on http://localhost:${config.port}`))

