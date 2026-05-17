import dotenv from 'dotenv'

dotenv.config()

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export type AppConfig = {
  port: number
  env: string
  pinecone: { apiKey: string; index: string }
  groq: { apiKey: string; model: string }
  logging: { debug: boolean }
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT || 3000),
    env: process.env.NODE_ENV || 'development',
    pinecone: {
      apiKey: required('PINECONE_API_KEY'),
      index: required('PINECONE_INDEX')
    },
    groq: {
      apiKey: required('GROQ_API_KEY'),
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    },
    logging: {
      debug: String(process.env.DEBUG || '').toLowerCase() === 'true'
    }
  }
}

