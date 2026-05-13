import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pinecone } from '@pinecone-database/pinecone'
import Groq from 'groq-sdk'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

// ─── INIT SERVICES ────────────────────────────────────
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
const index = pinecone.index(process.env.PINECONE_INDEX)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── HELPERS ──────────────────────────────────────────
function sanitise(text, max = 400) {
  if (!text) return ''
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

// ─── BUILD LIVE USER PROFILE ──────────────────────────
function buildLiveProfile(userHistory) {
  const stars = userHistory.map(r => parseFloat(r.stars))
  const avg = stars.reduce((a, b) => a + b, 0) / stars.length

  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  stars.forEach(s => dist[Math.round(s)]++)
  Object.keys(dist).forEach(k => {
    dist[k] = parseFloat((dist[k] / stars.length * 100).toFixed(1))
  })

  const harshness = avg < 3.5 ? 'harsh' : avg > 4.2 ? 'generous' : 'balanced'

  const avgLength = Math.round(
    userHistory.reduce((a, r) => a + (r.text || '').length, 0) / userHistory.length
  )

  // detect Nigerian writing
  const pidginWords = ['abeg','naija','dey','sha','omo','wahala',
    'wetin','dem','sabi','correct','wella','kukuma','no be']
  const allText = userHistory.map(r => r.text || '').join(' ').toLowerCase()
  const pidginCount = pidginWords.filter(w => allText.includes(w)).length
  const isNigerian = pidginCount >= 2
  const nigerianIntensity = pidginCount >= 5 ? 'high' : pidginCount >= 2 ? 'medium' : 'none'

  const summary = sanitise(`
    This reviewer has written ${userHistory.length} reviews
    with an average rating of ${avg.toFixed(1)} out of 5.
    They are a ${harshness} rater.
    Rating distribution: 5 stars ${dist[5]}%,
    4 stars ${dist[4]}%, 3 stars ${dist[3]}%,
    2 stars ${dist[2]}%, 1 star ${dist[1]}%.
    They write ${avgLength > 200 ? 'long detailed' : avgLength > 80 ? 'medium' : 'short'} reviews.
    ${isNigerian ? `They use Nigerian Pidgin English with ${nigerianIntensity} intensity.` : ''}
  `)

  return {
    avg_rating: parseFloat(avg.toFixed(2)),
    rating_distribution: dist,
    harshness,
    avg_review_length: avgLength,
    is_nigerian: isNigerian,
    nigerian_intensity: nigerianIntensity,
    summary
  }
}

// ─── PREDICT RATING ───────────────────────────────────
function predictRating(userProfile, similarUsers) {
  const globalAvg = 4.38  // from our dataset stats

  // user bias = how much they rate above/below average
  const userBias = userProfile.avg_rating - globalAvg

  // base from similar users
  let base = globalAvg
  if (similarUsers.length > 0) {
    const similarAvg = similarUsers.reduce((a, u) => a + (u.avg_rating || globalAvg), 0) / similarUsers.length
    base = similarAvg
  }

  // apply bias
  let predicted = base + userBias

  // harshness correction
  if (userProfile.harshness === 'harsh') predicted -= 0.2
  if (userProfile.harshness === 'generous') predicted += 0.2

  // clamp between 1 and 5
  predicted = Math.max(1, Math.min(5, predicted))

  // round to nearest 0.5
  predicted = Math.round(predicted * 2) / 2

  return predicted
}

// ─── BUILD PROMPT ─────────────────────────────────────
function buildPrompt(userHistory, userProfile, similarUsers, targetItem, predictedRating) {
  const historyText = userHistory.slice(0, 5).map((r, i) =>
    `Review ${i + 1}: ${'⭐'.repeat(Math.round(r.stars))} for "${r.item || 'item'}"
    "${sanitise(r.text, 200)}"`
  ).join('\n\n')

  const similarText = similarUsers.slice(0, 3).map((u, i) => {
    let reviews = []
    try { reviews = JSON.parse(u.sample_reviews || '[]') } catch (e) {}
    const sample = reviews[0]?.text ? sanitise(reviews[0].text, 150) : 'No sample available'
    return `Similar User ${i + 1} (avg: ${u.avg_rating}⭐, ${u.harshness} rater):
    "${sample}"`
  }).join('\n\n')

  const nigerianInstruction = userProfile.is_nigerian
    ? `IMPORTANT: This user writes in Nigerian Pidgin English with ${userProfile.nigerian_intensity} intensity.
       Use Nigerian slang naturally: "abeg", "e don do", "correct", "dey", "sha", "omo", "wella" etc.
       Reference Nigerian cultural context where relevant.`
    : ''

  return `You are simulating a real Amazon product reviewer.
Your job is to write EXACTLY how this specific user would write — matching their tone, vocabulary, length, and personality.

USER'S REVIEW HISTORY:
${historyText}

USER PROFILE:
- Average rating: ${userProfile.avg_rating}/5
- Rating style: ${userProfile.harshness} rater
- Review length: ${userProfile.avg_review_length > 200 ? 'long and detailed' : userProfile.avg_review_length > 80 ? 'medium length' : 'short and punchy'}
- Writing style: ${userProfile.is_nigerian ? `Nigerian Pidgin (${userProfile.nigerian_intensity} intensity)` : 'Standard English'}

WHAT SIMILAR USERS WROTE:
${similarText || 'No similar users found'}

TARGET PRODUCT:
- Name: ${sanitise(targetItem.name)}
- Category: ${sanitise(targetItem.category)}
- Description: ${sanitise(targetItem.description)}
- Price: ${sanitise(targetItem.price || 'Not specified')}

PREDICTED RATING: ${predictedRating} out of 5 stars

${nigerianInstruction}

RULES:
- Write ONLY the review text, nothing else
- Match this user's exact writing style and length
- Do NOT sound like an AI
- Do NOT be generic — be specific to this user's personality
- The review should feel like ${predictedRating >= 4 ? 'a positive experience' : predictedRating >= 3 ? 'a mixed experience' : 'a disappointing experience'}

Write the review now:`
}

// ─── MAIN SIMULATE ENDPOINT ───────────────────────────
app.post('/api/simulate', async (req, res) => {
  try {
    const { user_history, target_item } = req.body

    // validate input
    if (!user_history || !Array.isArray(user_history) || user_history.length === 0) {
      return res.status(400).json({ error: 'user_history is required and must be a non-empty array' })
    }
    if (!target_item || !target_item.name) {
      return res.status(400).json({ error: 'target_item with a name is required' })
    }

    // step 1 — build live user profile
    const userProfile = buildLiveProfile(user_history)

    // step 2 — search pinecone for similar users
    const searchResults = await index.searchRecords({
      query: {
        inputs: { text: userProfile.summary },
        topK: 10
      },
      fields: ['user_id', 'avg_rating', 'harshness', 'is_nigerian',
               'nigerian_intensity', 'sample_reviews', 'profile_summary']
    })

    const similarUsers = searchResults.result?.hits?.map(h => h.fields) || []

    // step 3 — predict rating mathematically
    const predictedRating = predictRating(userProfile, similarUsers)

    // step 4 — build prompt
    const prompt = buildPrompt(
      user_history,
      userProfile,
      similarUsers,
      target_item,
      predictedRating
    )

    // step 5 — call groq
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.85
    })

    const simulatedReview = completion.choices[0].message.content.trim()

    // step 6 — return result
    res.json({
      predicted_rating: predictedRating,
      simulated_review: simulatedReview,
      confidence_score: Math.min(100, Math.round(similarUsers.length * 10)),
      reasoning: {
        similar_users_found: similarUsers.length,
        user_bias: parseFloat((userProfile.avg_rating - 4.38).toFixed(2)),
        harshness: userProfile.harshness,
        style_detected: userProfile.is_nigerian
          ? `Nigerian Pidgin (${userProfile.nigerian_intensity})`
          : 'Standard English',
        avg_review_length: userProfile.avg_review_length
      }
    })

  } catch (e) {
    console.error('❌ Simulate error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── HEALTH CHECK ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Review Simulator API is running' })
})

// ─── SERVE VIEWS ──────────────────────────────────────
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.render('index')
})

// ─── START SERVER ─────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
})