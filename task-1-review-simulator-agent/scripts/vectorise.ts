import fs from 'fs'
import dotenv from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'
import { sanitizeText } from '../src/utils/text.js'

dotenv.config()

const BATCH_SIZE = 20
const MAX_PROFILES = 45000
const PROGRESS_FILE = './data/processed/upload_progress.json'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const pinecone = new Pinecone({ apiKey: required('PINECONE_API_KEY') })
const index = pinecone.index(required('PINECONE_INDEX'))

function loadProgress(): number {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
      console.log(`Resuming from index ${Number(data.lastIndex || 0).toLocaleString()}`)
      return Number(data.lastIndex || 0)
    }
  } catch {
    // ignore
  }
  return 0
}

function saveProgress(lastIndex: number) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastIndex }))
}

async function uploadBatch(records: any[]) {
  if (records.length === 0) return
  await index.upsertRecords({ records })
}

async function main() {
  console.log('Starting vectorisation...\n')

  const profiles = JSON.parse(fs.readFileSync('./data/processed/user_profiles.json', 'utf8'))
  console.log(`Loaded ${profiles.length.toLocaleString()} profiles`)

  const toProcess = profiles.slice(0, MAX_PROFILES)
  console.log(`Processing ${toProcess.length.toLocaleString()} profiles`)

  const startFrom = loadProgress()
  console.log(`Starting from index: ${startFrom}\n`)

  let batch: any[] = []
  let uploaded = 0
  let failed = 0
  let skipped = startFrom

  for (let i = startFrom; i < toProcess.length; i++) {
    const profile = toProcess[i]
    try {
      batch.push({
        id: profile.user_id,
        text: sanitizeText(profile.profile_summary),
        user_id: profile.user_id,
        source: profile.source,
        avg_rating: profile.avg_rating,
        harshness: profile.harshness,
        review_count: profile.review_count,
        is_nigerian: profile.is_nigerian,
        nigerian_intensity: profile.nigerian_intensity,
        categories: sanitizeText(profile.categories.join(',')),
        avg_review_length: profile.avg_review_length
      })

      if (batch.length === BATCH_SIZE) {
        await uploadBatch(batch)
        uploaded += batch.length
        batch = []
        saveProgress(i + 1)
        console.log(`Uploaded ${(uploaded + skipped).toLocaleString()} / ${toProcess.length.toLocaleString()}`)
      }
    } catch (e: any) {
      failed++
      saveProgress(i)
      console.error(`Failed batch near index ${i}: ${e?.message || e}`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  if (batch.length > 0) {
    await uploadBatch(batch)
    uploaded += batch.length
    console.log(`Uploaded ${(uploaded + skipped).toLocaleString()} / ${toProcess.length.toLocaleString()}`)
  }

  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE)

  console.log('\nVectorisation complete.')
  console.log(`Uploaded this run: ${uploaded.toLocaleString()}`)
  console.log(`Skipped (already done): ${skipped.toLocaleString()}`)
  console.log(`Failed: ${failed.toLocaleString()}`)
  console.log('\nYour Pinecone index is ready.')
}

main().catch(console.error)
