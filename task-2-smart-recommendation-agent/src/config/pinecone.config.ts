import { Pinecone } from '@pinecone-database/pinecone'
import getEnv from '../utils/env';

const pc = new Pinecone({ apiKey: getEnv("PINECONE_API_KEY") });

const indexName = getEnv("PINECONE_INDEX_NAME");

export const index = pc.index({name: indexName});

export default pc;
