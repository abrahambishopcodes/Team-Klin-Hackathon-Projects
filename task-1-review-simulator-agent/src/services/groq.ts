import Groq from 'groq-sdk'

export function createGroqClient({ apiKey }: { apiKey: string }) {
  return new Groq({ apiKey })
}
