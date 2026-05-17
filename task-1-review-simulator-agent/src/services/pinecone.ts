import { Pinecone } from '@pinecone-database/pinecone'

export function createPineconeClient({ apiKey, indexName }: { apiKey: string; indexName: string }) {
  const pinecone = new Pinecone({ apiKey })
  return pinecone.index(indexName)
}

