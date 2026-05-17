import { sanitizeText } from '../utils/text.js'

function stars(n: unknown): string {
  const count = Math.max(0, Math.min(5, Math.round(Number(n) || 0)))
  return '★'.repeat(count)
}

export type Stage1Analysis = {
  cares_about: string
  five_star_trigger: string
  one_star_trigger: string
  personality: string
  writing_traits: string
  would_focus_on: string
  predicted_sentiment: string
}

export function defaultAnalysis(predictedRating: number): Stage1Analysis {
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

export function buildStage1AnalysisPrompt(userHistory: any[], targetItem: any, predictedRating: number): string {
  const historyText = userHistory.slice(0, 5).map((r, i) =>
    `Review ${i + 1}: ${r.stars} stars for "${sanitizeText(r.item || 'item', 80)}" — "${sanitizeText(r.text, 240)}"`
  ).join('\n')

  const targetText = [
    `Name: ${sanitizeText(targetItem.name, 120)}`,
    `Category: ${sanitizeText(targetItem.category || 'Unknown', 60)}`,
    `Description: ${sanitizeText(targetItem.description || '', 260)}`,
    `Price: ${sanitizeText(targetItem.price || 'Not specified', 40)}`
  ].join('\n')

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

export function buildStage2GenerationPrompt(
  userHistory: any[],
  userProfile: any,
  analysis: Stage1Analysis,
  similarUsers: any[],
  targetItem: any,
  predictedRating: number
): string {
  const historyText = userHistory.slice(0, 5).map((r, i) =>
    `Review ${i + 1}: ${stars(r.stars)} for "${sanitizeText(r.item || 'item', 80)}"\n"${sanitizeText(r.text, 240)}"`
  ).join('\n\n')

  const similarText = similarUsers.slice(0, 3).map((u, i) => {
    let reviews: any[] = []
    try { reviews = JSON.parse(u.sample_reviews || '[]') } catch {}
    const sample = reviews[0]?.text ? sanitizeText(reviews[0].text, 220) : 'No sample available'
    return `Similar User ${i + 1} sample:\n"${sample}"`
  }).join('\n\n')

  const allText = userHistory.map(r => r.text || '').join(' ')
  const styleExample = sanitizeText(userHistory.find(r => (r.text || '').length > 20)?.text || allText, 180)

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

  const targetText = [
    `Name: ${sanitizeText(targetItem.name, 120)}`,
    `Category: ${sanitizeText(targetItem.category || 'Unknown', 60)}`,
    `Description: ${sanitizeText(targetItem.description || '', 260)}`,
    `Price: ${sanitizeText(targetItem.price || 'Not specified', 40)}`
  ].join('\n')

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
- Cares about: ${sanitizeText(analysis.cares_about, 200)}
- Five-star trigger: ${sanitizeText(analysis.five_star_trigger, 200)}
- One-star trigger: ${sanitizeText(analysis.one_star_trigger, 200)}
- Personality: ${sanitizeText(analysis.personality, 200)}
- Writing traits: ${sanitizeText(analysis.writing_traits, 240)}
- Would focus on: ${sanitizeText(analysis.would_focus_on, 240)}
- Predicted sentiment: ${sanitizeText(analysis.predicted_sentiment, 40)}

WHAT SIMILAR USERS WROTE:
${similarText || 'No similar users found'}

TARGET PRODUCT:
${targetText}

PREDICTED RATING: ${predictedRating} out of 5 stars

${nigerianInstruction}

Write the review now:`
}

