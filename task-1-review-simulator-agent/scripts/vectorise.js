import fs from 'fs'
import dotenv from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'

dotenv.config()

// ─── CONFIG ───────────────────────────────────────────
const BATCH_SIZE = 20
const MAX_PROFILES = 45000
const PROGRESS_FILE = './data/processed/upload_progress.json'

// ─── INIT PINECONE ────────────────────────────────────
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
const index = pinecone.index(process.env.PINECONE_INDEX)

// ─── SANITISE TEXT ────────────────────────────────────
function sanitise(text, maxLen = 400) {
  if (!text) return ''
  return text
    .replace(/[^\x20-\x7E]/g, ' ')  // remove non-ASCII
    .replace(/\\/g, ' ')             // remove backslashes
    .replace(/"/g, "'")              // replace double quotes
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim()
    .slice(0, maxLen)
}

// ─── PROGRESS TRACKER ─────────────────────────────────
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE))
      console.log(`📌 Resuming from index ${data.lastIndex.toLocaleString()}`)
      return data.lastIndex
    }
  } catch (e) {}
  return 0
}

function saveProgress(lastIndex) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastIndex }))
}

// ─── UPLOAD BATCH ─────────────────────────────────────
async function uploadBatch(records) {
  if (records.length === 0) return
  await index.upsertRecords({ records })
}

// ─── MAIN ─────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting vectorisation...\n')

  const profiles = JSON.parse(
    fs.readFileSync('./data/processed/user_profiles.json')
  )

  console.log(`📂 Loaded ${profiles.length.toLocaleString()} profiles`)

  const toProcess = profiles.slice(0, MAX_PROFILES)
  console.log(`📊 Processing ${toProcess.length.toLocaleString()} profiles`)

  // resume from last saved position
  const startFrom = loadProgress()
  console.log(`▶️  Starting from index: ${startFrom}\n`)

  let batch = []
  let uploaded = 0
  let failed = 0
  let skipped = startFrom

  for (let i = startFrom; i < toProcess.length; i++) {
    const profile = toProcess[i]

    try {
      batch.push({
        id:                profile.user_id,
        text:              sanitise(profile.profile_summary),
        user_id:           profile.user_id,
        source:            profile.source,
        avg_rating:        profile.avg_rating,
        harshness:         profile.harshness,
        review_count:      profile.review_count,
        is_nigerian:       profile.is_nigerian,
        nigerian_intensity:profile.nigerian_intensity,
        categories:        sanitise(profile.categories.join(',')),
        avg_review_length: profile.avg_review_length
      })

      if (batch.length === BATCH_SIZE) {
        await uploadBatch(batch)
        uploaded += batch.length
        batch = []
        saveProgress(i + 1)   // save progress after every batch
        console.log(`  ✅ Uploaded ${(uploaded + skipped).toLocaleString()} / ${toProcess.length.toLocaleString()}`)
      }

    } catch (e) {
      failed++
      // save progress so we can resume
      saveProgress(i)
      console.error(`  ❌ Failed batch near index ${i}: ${e.message}`)
      
      // wait 2 seconds and continue
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  // upload remaining
  if (batch.length > 0) {
    await uploadBatch(batch)
    uploaded += batch.length
    console.log(`  ✅ Uploaded ${(uploaded + skipped).toLocaleString()} / ${toProcess.length.toLocaleString()}`)
  }

  // clear progress file — we are done
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE)

  console.log(`\n🎉 Vectorisation complete!`)
  console.log(`   Uploaded this run: ${uploaded.toLocaleString()}`)
  console.log(`   Skipped (already done): ${skipped.toLocaleString()}`)
  console.log(`   Failed:  ${failed.toLocaleString()}`)
  console.log(`\n✅ Your Pinecone index is ready!`)
}

main().catch(console.error)