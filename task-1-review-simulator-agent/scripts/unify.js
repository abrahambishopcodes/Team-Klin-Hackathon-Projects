import fs from 'fs'
import readline from 'readline'
import path from 'path'

// ─── CONFIG ───────────────────────────────────────────
const DATA_DIR = './data/amazon'
const OUTPUT_DIR = './data/processed'
const MIN_REVIEWS_PER_USER = 3
const MAX_REVIEWS_PER_USER = 3

const FILES = [
  { file: 'All_Beauty.jsonl',              category: 'Beauty' },
  { file: 'Gift_Cards.jsonl',              category: 'Gift Cards' },
  { file: 'Handmade_Products.jsonl',       category: 'Handmade' },
  { file: 'Health_and_Personal_Care.jsonl',category: 'Health' },
]

// ─── NIGERIAN PIDGIN DETECTOR ─────────────────────────
const PIDGIN_KEYWORDS = [
  'abeg', 'naija', 'e don', 'no be', 'omo', 'wahala',
  'dey', 'wetin', 'sha', ' na ', 'dem ', 'sabi', 'chop',
  'jollof', 'suya', 'eba', 'correct', 'no cap', 'pepper',
  'yawa', 'gbas', 'gbos', 'wella', 'kukuma', 'ginger'
]

function detectNigerian(text) {
  if (!text) return { isNigerian: false, intensity: 'none', score: 0 }
  const lower = text.toLowerCase()
  const matches = PIDGIN_KEYWORDS.filter(k => lower.includes(k))
  const score = matches.length / PIDGIN_KEYWORDS.length
  return {
    isNigerian: score > 0.02,
    intensity: score > 0.1 ? 'high' : score > 0.04 ? 'medium' : 'low',
    score: parseFloat(score.toFixed(4))
  }
}

// ─── UNIFIED FORMAT BUILDER ───────────────────────────
function buildUnifiedReview(raw, category) {
  const text = (raw.text || '').trim()
  const nigerian = detectNigerian(text)
  return {
    user_id:           `amazon_${raw.user_id}`,
    item_id:           `amazon_${raw.asin}`,
    source:            'amazon',
    category,
    stars:             Math.min(5, Math.max(1, Math.round(raw.rating))),
    title:             (raw.title || '').trim(),
    text,
    timestamp:         raw.timestamp || 0,
    helpful_vote:      raw.helpful_vote || 0,
    verified_purchase: raw.verified_purchase || false,
    is_nigerian:       nigerian.isNigerian,
    nigerian_intensity:nigerian.intensity,
    nigerian_score:    nigerian.score,
  }
}

// ─── FILE PROCESSOR ───────────────────────────────────
async function processFile({ file, category }) {
  const filePath = path.join(DATA_DIR, file)
  console.log(`\n�� Processing ${file}...`)

  const userReviews = {}  // user_id → [reviews]

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  })

  let lineCount = 0

  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      const raw = JSON.parse(line)
      if (!raw.user_id || !raw.rating || !raw.text) continue

      const unified = buildUnifiedReview(raw, category)
      const uid = unified.user_id

      if (!userReviews[uid]) userReviews[uid] = []
      userReviews[uid].push(unified)

      lineCount++
      if (lineCount % 100000 === 0) {
        console.log(`  → ${lineCount.toLocaleString()} lines read...`)
      }
    } catch (e) {
      // skip malformed lines
    }
  }

  console.log(`  ✅ ${lineCount.toLocaleString()} reviews read`)
  console.log(`  👤 ${Object.keys(userReviews).length.toLocaleString()} unique users found`)
  return userReviews
}

// ─── BUILD USER PROFILES ──────────────────────────────
function buildUserProfile(userId, reviews) {
  const stars = reviews.map(r => r.stars)
  const avg = stars.reduce((a, b) => a + b, 0) / stars.length

  // rating distribution
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  stars.forEach(s => dist[s]++)
  Object.keys(dist).forEach(k => {
    dist[k] = parseFloat((dist[k] / stars.length * 100).toFixed(1))
  })

  // writing style
  const avgLength = Math.round(
    reviews.reduce((a, r) => a + r.text.length, 0) / reviews.length
  )
  const nigerianReviews = reviews.filter(r => r.is_nigerian)
  const isNigerian = nigerianReviews.length > 0
  const nigerianIntensity = isNigerian
    ? (nigerianReviews.length / reviews.length > 0.5 ? 'high' : 'medium')
    : 'none'

  // preference signals
  const loved = reviews.filter(r => r.stars >= 4).map(r => r.item_id)
  const hated = reviews.filter(r => r.stars <= 2).map(r => r.item_id)

  const harshness = avg < 3.5 ? 'harsh' : avg > 4.2 ? 'generous' : 'balanced'

  // profile summary text (this gets vectorised)
  const summary = `
    This Amazon reviewer has written ${reviews.length} reviews 
    with an average rating of ${avg.toFixed(1)} out of 5.
    They are a ${harshness} rater.
    Their rating distribution is: 
    5 stars ${dist[5]}%, 4 stars ${dist[4]}%, 
    3 stars ${dist[3]}%, 2 stars ${dist[2]}%, 1 star ${dist[1]}%.
    They write ${avgLength > 200 ? 'long detailed' : avgLength > 80 ? 'medium length' : 'short'} reviews 
    averaging ${avgLength} characters.
    ${isNigerian ? `They use Nigerian Pidgin English with ${nigerianIntensity} intensity.` : ''}
    They have loved items in categories: ${[...new Set(reviews.filter(r => r.stars >= 4).map(r => r.category))].join(', ')}.
    Sample review: "${reviews[0].text.slice(0, 150)}"
  `.replace(/\s+/g, ' ').trim()

  return {
    user_id: userId,
    source: 'amazon',
    review_count: reviews.length,
    avg_rating: parseFloat(avg.toFixed(2)),
    rating_distribution: dist,
    harshness,
    avg_review_length: avgLength,
    is_nigerian: isNigerian,
    nigerian_intensity: nigerianIntensity,
    loved_items: loved.slice(0, 10),
    hated_items: hated.slice(0, 10),
    categories: [...new Set(reviews.map(r => r.category))],
    profile_summary: summary,
    // only keep top 3 reviews for context
    sample_reviews: reviews.slice(0, MAX_REVIEWS_PER_USER)
  }
}

// ─── MAIN ─────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting data unification...\n')

  // create output dir
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const allUserReviews = {}

  // process all files
  for (const fileConfig of FILES) {
    const userReviews = await processFile(fileConfig)
    // merge into master object
    for (const [uid, reviews] of Object.entries(userReviews)) {
      if (!allUserReviews[uid]) allUserReviews[uid] = []
      allUserReviews[uid].push(...reviews)
    }
  }

  console.log('\n📊 Building user profiles...')

  const profiles = []
  let skipped = 0

  for (const [uid, reviews] of Object.entries(allUserReviews)) {
    // only keep users with MIN reviews
    if (reviews.length < MIN_REVIEWS_PER_USER) {
      skipped++
      continue
    }
    const profile = buildUserProfile(uid, reviews)
    profiles.push(profile)
  }

  console.log(`✅ ${profiles.length.toLocaleString()} user profiles built`)
  console.log(`⏭️  ${skipped.toLocaleString()} users skipped (< ${MIN_REVIEWS_PER_USER} reviews)`)

  // save profiles to disk
  const outputPath = path.join(OUTPUT_DIR, 'user_profiles.json')
  fs.writeFileSync(outputPath, JSON.stringify(profiles, null, 2))
  console.log(`\n💾 Saved to ${outputPath}`)

  // quick stats
  const nigerianCount = profiles.filter(p => p.is_nigerian).length
  const avgRating = profiles.reduce((a, p) => a + p.avg_rating, 0) / profiles.length
  console.log(`\n📈 Stats:`)
  console.log(`   Total profiles:    ${profiles.length.toLocaleString()}`)
  console.log(`   Nigerian users:    ${nigerianCount.toLocaleString()}`)
  console.log(`   Global avg rating: ${avgRating.toFixed(2)}`)
  console.log('\n✅ Unification complete!')
}

main().catch(console.error)
