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

function buildStage1AnalysisPrompt(userHistory, targetItem, predictedRating) {
  const historyText = userHistory.slice(0, 5).map((r, i) =>
    `Review ${i + 1}: ${r.stars} stars for "${sanitise(r.item || 'item', 80)}" — "${sanitise(r.text, 240)}"`
  ).join('\n')

  const targetText = `Name: ${sanitise(targetItem.name, 120)}\nCategory: ${sanitise(targetItem.category || 'Unknown', 60)}\nDescription: ${sanitise(targetItem.description || '', 260)}\nPrice: ${sanitise(targetItem.price || 'Not specified', 40)}`

  return `Analyse this user's review history and respond ONLY in valid JSON with no extra text, no markdown, no backticks. Return exactly this structure:
{
  "cares_about": "string",
  "five_star_trigger": "string",
  "one_star_trigger": "string",
  "personality": "string",
  "writing_traits": "string",
  "would_focus_on": "string",
  "predicted_sentiment": "string"
}

User history:
${historyText}

Target product:
${targetText}

Predicted rating: ${predictedRating}`
}

function buildStage2GenerationPrompt(userHistory, userProfile, analysis, similarUsers, targetItem, predictedRating) {
  const historyText = userHistory.slice(0, 5).map((r, i) =>
    `Review ${i + 1}: ${'⭐'.repeat(Math.round(r.stars))} for "${sanitise(r.item || 'item', 80)}"\n"${sanitise(r.text, 240)}"`
  ).join('\n\n')

  const similarText = similarUsers.slice(0, 3).map((u, i) => {
    let reviews = []
    try { reviews = JSON.parse(u.sample_reviews || '[]') } catch (e) {}
    const sample = reviews[0]?.text ? sanitise(reviews[0].text, 220) : 'No sample available'
    return `Similar User ${i + 1} sample:\n"${sample}"`
  }).join('\n\n')

  const allText = userHistory.map(r => r.text || '').join(' ')
  const styleExample = sanitise(userHistory.find(r => (r.text || '').length > 20)?.text || allText, 180)

  const endsWithO = /\b(o|oo)\s*[.!?]?\s*$/i.test(styleExample)
  const endsWithSha = /\bsha\s*[.!?]?\s*$/i.test(styleExample)
  const endsWithOo = /\boo\s*[.!?]?\s*$/i.test(styleExample)
  const usesDey = /\bdey\b/i.test(allText)
  const repeatsWords = /\b(\w+)\s+\1\b/i.test(allText.toLowerCase())

  const nigerianInstruction = userProfile.is_nigerian
    ? `NIGERIAN STYLE INSTRUCTIONS:
- This user writes in Nigerian Pidgin English with ${userProfile.nigerian_intensity} intensity.
- End some sentences with ${[endsWithO ? '"o"' : null, endsWithSha ? '"sha"' : null, endsWithOo ? '"oo"' : null].filter(Boolean).join(', ') || '"o/sha/oo" as appropriate'} based on the user's real patterns.
- ${usesDey ? 'Use "dey" naturally instead of "is/are" when it fits (the user does this).' : 'Only use "dey" if it feels natural for this user.'}
- ${repeatsWords ? 'Occasionally repeat words for emphasis (the user does this).' : 'Do not overuse repetition.'}
- Use one real style reference from the user's own writing: "${styleExample}"`
    : `STYLE REFERENCE from the user's own writing: "${styleExample}"`

  const avgLen = userProfile.avg_review_length
  const lengthGuide = avgLen > 200 ? 'long and detailed' : avgLen > 80 ? 'medium length' : 'short and punchy'

  const targetText = `Name: ${sanitise(targetItem.name, 120)}\nCategory: ${sanitise(targetItem.category || 'Unknown', 60)}\nDescription: ${sanitise(targetItem.description || '', 260)}\nPrice: ${sanitise(targetItem.price || 'Not specified', 40)}`

  return `You are simulating a real Amazon product reviewer.
Write EXACTLY how this specific user would write — match their tone, vocabulary, length, and personality.

IMPORTANT RULES:
- Output ONLY the review text, nothing else
- No preamble like "Here is the review:"
- No explanation after the review
- Match the user's average review length closely (${avgLen} chars typical; aim for ${lengthGuide})
- The review must feel like a real specific person, not an AI
- Formatting: write in normal paragraphs. Do NOT put every sentence on a new line. Use line breaks only between paragraphs (max 2).

USER'S REVIEW HISTORY (up to 5):
${historyText}

STAGE 1 ANALYSIS (JSON-derived):
- Cares about: ${sanitise(analysis.cares_about, 200)}
- Five-star trigger: ${sanitise(analysis.five_star_trigger, 200)}
- One-star trigger: ${sanitise(analysis.one_star_trigger, 200)}
- Personality: ${sanitise(analysis.personality, 200)}
- Writing traits: ${sanitise(analysis.writing_traits, 240)}
- Would focus on: ${sanitise(analysis.would_focus_on, 240)}
- Predicted sentiment: ${sanitise(analysis.predicted_sentiment, 40)}

WHAT SIMILAR USERS WROTE:
${similarText || 'No similar users found'}

TARGET PRODUCT:
${targetText}

PREDICTED RATING: ${predictedRating} out of 5 stars

${nigerianInstruction}

Write the review now:`
}

function defaultAnalysis(predictedRating) {
  const sentiment = predictedRating >= 4 ? 'positive' : predictedRating >= 3 ? 'mixed' : 'negative'
  return {
    cares_about: 'Quality and value for money',
    five_star_trigger: 'Product exceeds expectations and works as described',
    one_star_trigger: 'Does not work as described or feels like poor value',
    personality: 'Straight-to-the-point and experience-driven reviewer',
    writing_traits: 'Clear, practical, and focused on what worked vs what did not',
    would_focus_on: 'Performance, ease of use, durability, and whether it matches the description',
    predicted_sentiment: sentiment
  }
}

function safeParseJsonObject(text) {
  try {
    const trimmed = String(text || '').trim()
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch (e) {}
  return null
}

function computeConfidenceScore(similarUsersCount, { categoryMatch, hasTargetCategory }) {
  let score = Math.round(similarUsersCount * 8)
  score = Math.min(85, score)

  if (hasTargetCategory) {
    if (categoryMatch) score = Math.min(95, score + 10)
    else score = Math.min(70, score)
  } else {
    score = Math.min(80, score)
  }

  if (similarUsersCount < 3) score = Math.min(60, score)

  score = Math.max(0, Math.min(95, score))
  return score
}

function wordCount(text) {
  const tokens = String(text || '').trim().split(/\s+/).filter(Boolean)
  return tokens.length
}

function computeUserWordStats(userHistory) {
  const counts = (userHistory || []).map(r => wordCount(r?.text)).filter(n => Number.isFinite(n) && n > 0)
  if (counts.length === 0) return { avgWords: 0, stdWords: 0, minWords: 0, maxWords: 0 }

  const avgWords = counts.reduce((a, b) => a + b, 0) / counts.length
  const variance = counts.reduce((acc, n) => acc + Math.pow(n - avgWords, 2), 0) / counts.length
  const stdWords = Math.sqrt(variance)

  return {
    avgWords,
    stdWords,
    minWords: Math.min(...counts),
    maxWords: Math.max(...counts)
  }
}

function computeTargetWordRange(userHistory) {
  const stats = computeUserWordStats(userHistory)
  const avg = stats.avgWords || 0
  const std = stats.stdWords || 0

  // Predicted length: mostly user's average, slightly stabilized.
  const predicted = Math.round(avg * 0.9 + Math.min(12, avg * 0.1))

  const min = Math.max(25, Math.round(predicted - Math.max(12, std)))
  const max = Math.min(220, Math.round(predicted + Math.max(18, std)))

  return { predicted, min, max, stats }
}

function clipToMaxWords(text, maxWords) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return String(text || '').trim()
  return words.slice(0, maxWords).join(' ').replace(/[,\s]+$/g, '').trim()
}

function normalizeLineBreaks(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n')
  const paragraphs = raw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return ''

  const normalizePara = (para) => {
    const lines = para.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length <= 1) return para.trim()

    const punctEnds = lines.filter(l => /[.!?]$/.test(l)).length
    const manyShortLines = lines.filter(l => l.length <= 90).length
    const looksLikeOneSentencePerLine = punctEnds / lines.length >= 0.6 && manyShortLines / lines.length >= 0.6

    if (!looksLikeOneSentencePerLine) return lines.join(' ')

    // Join sentence-per-line output into a proper paragraph.
    return lines.join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const normalized = paragraphs.map(normalizePara).join('\n\n')
  return normalized.replace(/\n{3,}/g, '\n\n').trim()
}

function deCliche(text) {
  let out = String(text || '')
  const replacements = [
    { re: /\bhassle\b/gi, to: 'stress' },
    { re: /\bgame[- ]changer\b/gi, to: 'big difference' },
    { re: /\bseamless\b/gi, to: 'smooth' },
    { re: /\btop[- ]notch\b/gi, to: 'very good' },
    { re: /\bhighly recommend\b/gi, to: 'I recommend' },
    { re: /\bmust[- ]have\b/gi, to: 'worth it' },
    { re: /\babsolutely love\b/gi, to: 'I really like' },
    { re: /\bblew me away\b/gi, to: 'surprised me' },
    { re: /\bchanged my life\b/gi, to: 'helped a lot' }
  ]
  for (const { re, to } of replacements) out = out.replace(re, to)
  return out.trim()
}

function reviewIssues(text, wordRange) {
  const t = String(text || '').trim()
  const words = wordCount(t)
  const sentences = (t.match(/[.!?]/g) || []).length

  const banned = [
    /\bhassle\b/i,
    /\bseamless\b/i,
    /\bgame[- ]changer\b/i,
    /\btop[- ]notch\b/i,
    /\bmust[- ]have\b/i,
    /\bhighly recommend\b/i,
    /\bblew me away\b/i,
    /\bchanged my life\b/i
  ]

  const tooShort = words > 0 && words < wordRange.min
  const tooFlat = words > 45 && sentences < 2
  const hasBanned = banned.some(re => re.test(t))

  const issues = []
  if (tooShort) issues.push('too_short')
  if (tooFlat) issues.push('too_flat')
  if (hasBanned) issues.push('banned_words')
  return { issues, words, sentences }
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
    const pineconeFields = ['user_id', 'avg_rating', 'harshness', 'is_nigerian',
      'nigerian_intensity', 'sample_reviews', 'profile_summary']

    const targetCategoryRaw = (target_item.category || '').trim()
    let categoryMatch = false

    let searchResults = null
    let similarUsers = []

    if (targetCategoryRaw) {
      try {
        const filtered = await index.searchRecords({
          query: {
            inputs: { text: userProfile.summary },
            topK: 10,
            filter: { categories: { $eq: targetCategoryRaw } }
          },
          fields: pineconeFields
        })
        const filteredUsers = filtered.result?.hits?.map(h => h.fields) || []
        if (filteredUsers.length >= 3) {
          similarUsers = filteredUsers
          categoryMatch = true
        }
      } catch (e) {
        console.warn('⚠️ Pinecone filtered search failed, falling back:', e.message)
      }
    }

    if (similarUsers.length < 3) {
      searchResults = await index.searchRecords({
        query: {
          inputs: { text: userProfile.summary },
          topK: 10
        },
        fields: pineconeFields
      })
      similarUsers = searchResults.result?.hits?.map(h => h.fields) || []
      categoryMatch = false
    }

    // step 3 — predict rating mathematically
    const predictedRating = predictRating(userProfile, similarUsers)

    const start = Date.now()

    // step 4 — stage 1 analysis
    console.log('🧠 Stage 1: Analysing user behaviour...')
    const stage1Prompt = buildStage1AnalysisPrompt(user_history, target_item, predictedRating)
    let analysis = defaultAnalysis(predictedRating)

    try {
      const stage1 = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: stage1Prompt }],
        max_tokens: 500,
        temperature: 0.3
      })
      const stage1Text = stage1.choices?.[0]?.message?.content || ''
      const parsed = safeParseJsonObject(stage1Text)
      if (parsed) analysis = { ...analysis, ...parsed }
      else console.warn('⚠️ Stage 1 JSON parse failed, using defaults')
    } catch (e) {
      console.warn('⚠️ Stage 1 failed, using defaults:', e.message)
    }

    // step 5 — stage 2 generation
    console.log('✍️  Stage 2: Generating review...')
    const wordRange = computeTargetWordRange(user_history)
    const stage2Prompt = buildStage2GenerationPrompt(
      user_history,
      userProfile,
      analysis,
      similarUsers,
      target_item,
      predictedRating
    )

    let simulatedReview = ''
    try {
      const stage2 = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `${stage2Prompt}

LENGTH TARGET (very important):
- Aim for about ${wordRange.predicted} words (keep it between ${wordRange.min} and ${wordRange.max} words).

WORD CHOICE RULE (very important):
- Avoid AI-ish/cliché words/phrases like "hassle", "seamless", "game-changer", "top-notch", "must-have", "blew me away", "changed my life", "highly recommend".`
        }],
        max_tokens: Math.min(800, Math.max(180, Math.round(wordRange.max * 2))),
        temperature: 0.85
      })
      simulatedReview = (stage2.choices?.[0]?.message?.content || '').trim()
    } catch (e) {
      console.error('❌ Stage 2 generation error:', e.message)
      return res.status(500).json({ error: 'Failed to generate simulated review. Please try again.' })
    }

    const firstCheck = reviewIssues(simulatedReview, wordRange)
    if (firstCheck.issues.length > 0) {
      try {
        const retry = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Rewrite the review below to match the user's real style.

Hard requirements:
- Output ONLY the review text, nothing else
- Keep it between ${wordRange.min} and ${wordRange.max} words (aim ~${wordRange.predicted})
- Use normal paragraphs (1–3). Do NOT put every sentence on a new line.
- Be specific (mention concrete issues/details), avoid generic lines
- Avoid these words/phrases: "hassle", "seamless", "game-changer", "top-notch", "must-have", "blew me away", "changed my life", "highly recommend"

Original review:
${simulatedReview}`
          }],
          max_tokens: Math.min(800, Math.max(180, Math.round(wordRange.max * 2))),
          temperature: 0.85
        })
        simulatedReview = (retry.choices?.[0]?.message?.content || '').trim()
      } catch (e) {
        console.warn('⚠️ Stage 2 retry failed, using first output:', e.message)
      }
    }

    simulatedReview = normalizeLineBreaks(simulatedReview)
    simulatedReview = deCliche(simulatedReview)
    simulatedReview = clipToMaxWords(simulatedReview, wordRange.max)
    simulatedReview = normalizeLineBreaks(simulatedReview)

    console.log(`✅ Done in ${Date.now() - start}ms`)

    // step 6 — return result
    const confidenceScore = computeConfidenceScore(similarUsers.length, {
      categoryMatch,
      hasTargetCategory: Boolean(targetCategoryRaw)
    })

    res.json({
      predicted_rating: predictedRating,
      simulated_review: simulatedReview,
      confidence_score: confidenceScore,
      analysis,
      reasoning: {
        similar_users_found: similarUsers.length,
        category_match: categoryMatch,
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
