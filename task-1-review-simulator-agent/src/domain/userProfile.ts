import type { Logger } from '../logger.js'
import { analyseNigerianStyle } from './nigerianStyle.js'
import { sanitizeText } from '../utils/text.js'

export type UserReview = {
  stars?: number | string
  text?: string
  item?: string
  category?: string
}

export type LiveUserProfile = {
  avg_rating: number
  review_count: number
  rating_distribution: Record<number, number>
  harshness: string
  avg_review_length: number
  vocabulary_richness: number
  writing_pace: string
  mentions_price: boolean
  mentions_comparison: boolean
  mentions_service: boolean
  gives_advice: boolean
  sarcastic_tendency: boolean
  uses_exclamations: boolean
  uses_questions: boolean
  avg_sentence_count: number
  rating_variance: number
  recent_trend: string
  category_expertise: string
  nigerianStyle: ReturnType<typeof analyseNigerianStyle>
  summary: string
  category_ratings: Array<{ category: string; avg_rating: number; review_count: number }>
}

export function buildLiveProfile(userHistory: UserReview[], { log }: { log?: Logger } = {}): LiveUserProfile {
  if (!userHistory || userHistory.length === 0) {
    return {
      avg_rating: 0,
      review_count: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      harshness: 'unknown',
      avg_review_length: 0,
      vocabulary_richness: 0,
      writing_pace: 'unknown',
      mentions_price: false,
      mentions_comparison: false,
      mentions_service: false,
      gives_advice: false,
      sarcastic_tendency: false,
      uses_exclamations: false,
      uses_questions: false,
      avg_sentence_count: 0,
      rating_variance: 0,
      recent_trend: 'stable',
      category_expertise: 'versatile reviewer',
      nigerianStyle: analyseNigerianStyle([]),
      summary: '',
      category_ratings: []
    }
  }

  const stars = userHistory.map(r => parseFloat(String(r.stars ?? '')) || 0).filter(s => s > 0)
  if (stars.length === 0) {
    return {
      avg_rating: 0,
      review_count: 0,
      rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      harshness: 'unknown',
      avg_review_length: 0,
      vocabulary_richness: 0,
      writing_pace: 'unknown',
      mentions_price: false,
      mentions_comparison: false,
      mentions_service: false,
      gives_advice: false,
      sarcastic_tendency: false,
      uses_exclamations: false,
      uses_questions: false,
      avg_sentence_count: 0,
      rating_variance: 0,
      recent_trend: 'stable',
      category_expertise: 'versatile reviewer',
      nigerianStyle: analyseNigerianStyle(userHistory),
      summary: '',
      category_ratings: []
    }
  }

  const avg = stars.reduce((a, b) => a + b, 0) / stars.length
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  stars.forEach(s => { dist[Math.round(s)] = (dist[Math.round(s)] || 0) + 1 })
  // Store raw counts — predictRating handles normalisation internally

  const harshness = avg < 3.5 ? 'harsh' : avg > 4.2 ? 'generous' : 'balanced'
  const reviewLengths = userHistory.map(r => (r.text || '').length)
  const avgLength = Math.round(reviewLengths.reduce((a, b) => a + b, 0) / reviewLengths.length)

  const allText = userHistory.map(r => r.text || '').join(' ')
  const words = allText.toLowerCase().match(/\b\w+\b/g) || []
  const vocabularyRichness = new Set(words).size
  const avgWordLength = words.length > 0
    ? (words.reduce((a, w) => a + w.length, 0) / words.length).toFixed(1)
    : '0'

  const technicalKeywords = [
    'ingredients', 'formula', 'texture', 'consistency', 'absorption',
    'dosage', 'mg', 'vitamin', 'spf', 'organic', 'chemical', 'extract', 'serum', 'retinol', 'hyaluronic'
  ]
  const hasTechnicalTerms = technicalKeywords.some(k => allText.includes(k))

  const hasSuperlatives = ['amazing', 'terrible', 'incredible', 'awful', 'fantastic', 'horrible', 'perfect', 'worst', 'best', 'excellent']
    .some(s => allText.includes(s))

  const hasFillerPhrases = ['to be honest', 'in my opinion', 'i must say', 'i have to say', 'let me tell you', 'trust me']
    .some(f => allText.includes(f))

  const mentionsPrice = ['price', 'worth', 'money', 'cheap', 'expensive', 'value', 'cost', 'affordable', 'overpriced', 'naira', '₦']
    .some(k => allText.includes(k))

  const mentionsComparison = ['better than', 'compared to', 'unlike', 'versus', 'other brands', 'similar to', 'worse than']
    .some(k => allText.includes(k))

  const mentionsService = ['delivery', 'shipping', 'packaging', 'customer service', 'arrived', 'damaged', 'sealed', 'wrapped']
    .some(k => allText.includes(k))

  const givesAdvice = ['recommend', 'suggest', 'try it', 'go for it', "don't buy", 'save your money', 'worth trying', 'abeg try am']
    .some(k => allText.includes(k))

  const positiveWords = ['good', 'great', 'love', 'amazing', 'excellent', 'perfect', 'beautiful']
  const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'poor', 'useless']
  const positiveCount = positiveWords.filter(w => allText.includes(w)).length
  const negativeCount = negativeWords.filter(w => allText.includes(w)).length
  const sarcastic_tendency = avg <= 3 && positiveCount > negativeCount && positiveCount > 3

  const uses_exclamations = ((allText.match(/!/g) || []).length / userHistory.length) > 0.3
  const uses_questions = ((allText.match(/\?/g) || []).length / userHistory.length) > 0.2

  const sentenceCountPerReview = userHistory.map(r => {
    const sentences = (r.text || '').match(/[.!?]+/g) || []
    return Math.max(1, sentences.length)
  })
  const avg_sentence_count = sentenceCountPerReview.length > 0
    ? Number((sentenceCountPerReview.reduce((a, b) => a + b, 0) / sentenceCountPerReview.length).toFixed(1))
    : 0

  const writing_pace = avg_sentence_count < 3 ? 'rapid' : avg_sentence_count <= 6 ? 'moderate' : 'detailed'

  const ratingVariance = stars.length > 1
    ? Number(Math.sqrt(stars.reduce((a, s) => a + Math.pow(s - avg, 2), 0) / stars.length).toFixed(2))
    : 0

  let ratingConsistency = 'varied'
  if (ratingVariance < 0.8) ratingConsistency = 'consistent'
  else if (ratingVariance > 1.5) ratingConsistency = 'unpredictable'

  let recent_trend = 'stable'
  if (stars.length >= 4) {
    const firstTwo = stars.slice(0, 2).reduce((a, b) => a + b, 0) / 2
    const lastTwo = stars.slice(-2).reduce((a, b) => a + b, 0) / 2
    if (lastTwo > firstTwo + 0.5) recent_trend = 'trending positive'
    else if (lastTwo < firstTwo - 0.5) recent_trend = 'trending negative'
  }

  const categories = userHistory.map(r => (r.category || '').toLowerCase()).filter(Boolean)
  
  // Group reviews by category and compute per-category avg rating
  const categoryMap: Record<string, { total: number; count: number }> = {}
  userHistory.forEach(r => {
    const cat = (r.category || 'Unknown').trim()
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 }
    categoryMap[cat].total += parseFloat(String(r.stars ?? '')) || 0
    categoryMap[cat].count++
  })
  const category_ratings = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    avg_rating: parseFloat((data.total / data.count).toFixed(2)),
    review_count: data.count
  }))

  let category_expertise = 'versatile reviewer'
  if (categories.length > 0) {
    const unique = [...new Set(categories)]
    if (unique.length === 1) {
      const cat = unique[0]
      if (cat.includes('beauty') || cat.includes('skin') || cat.includes('hair')) category_expertise = 'beauty enthusiast'
      else if (cat.includes('health') || cat.includes('wellness')) category_expertise = 'health conscious'
      else if (cat.includes('handmade') || cat.includes('craft')) category_expertise = 'craft appreciator'
      else if (cat.includes('gift')) category_expertise = 'gift giver'
    }
  }

  const nigerianStyle = analyseNigerianStyle(userHistory)
  if (nigerianStyle.isNigerian) log?.debug(`Nigerian style detected (${nigerianStyle.intensity}, score ${nigerianStyle.nigerianScore}/100)`)

  let summary = `This Amazon reviewer has written ${userHistory.length} reviews with an average rating of ${avg.toFixed(1)} out of 5, making them a ${harshness} rater. `
  summary += `Their ratings vary ${ratingConsistency} with a variance of ${ratingVariance}. `
  summary += `They tend to write ${writing_pace} reviews, averaging ${avg_sentence_count} sentences per review. `

  const avgLengthCategory = avgLength > 200 ? 'long and detailed (200+ chars)' : avgLength > 80 ? 'medium-length (80-200 chars)' : 'short and concise (under 80 chars)'
  summary += `Their reviews are typically ${avgLengthCategory}. `
  summary += `They have used ${vocabularyRichness} unique words across their reviews, with an average word length of ${avgWordLength} characters. `

  if (hasTechnicalTerms) summary += 'They frequently use technical and ingredient-related terminology, suggesting detailed product knowledge. '
  if (hasSuperlatives) summary += 'They employ superlative language to emphasize their opinions. '
  if (hasFillerPhrases) summary += 'They use conversational filler phrases to add personality to their reviews. '
  if (mentionsPrice) summary += 'Price and value for money are important to this reviewer — they frequently mention cost and affordability. '
  if (mentionsComparison) summary += 'They often compare products to alternatives or competing brands, suggesting they are a comparative shopper. '
  if (mentionsService) summary += 'They pay attention to delivery, packaging, and customer service aspects of their purchase experience. '
  if (givesAdvice) summary += 'This reviewer regularly offers recommendations to other buyers based on their experiences. '
  if (sarcastic_tendency) summary += 'They sometimes use positive language while giving lower ratings, suggesting occasional sarcasm or nuanced criticism. '

  summary += `They ${uses_exclamations ? 'frequently' : 'rarely'} use exclamation marks and ${uses_questions ? 'often' : 'rarely'} ask questions in their reviews. `
  summary += `Recently their ratings have been ${recent_trend}. `
  summary += `Their writing style is characterized as ${category_expertise}. `
  if (nigerianStyle.isNigerian) summary += `They write in Nigerian Pidgin English with ${nigerianStyle.intensity} intensity. `

  const longestReview = userHistory.reduce((a, b) => ((b.text || '').length > (a.text || '').length ? b : a))
  if (longestReview?.text) summary += `Sample of their writing style: "${sanitizeText(longestReview.text, 200)}"`

  summary = sanitizeText(summary, 800)

  return {
    avg_rating: Number(avg.toFixed(2)),
    review_count: userHistory.length,
    rating_distribution: dist,
    harshness,
    avg_review_length: avgLength,
    vocabulary_richness: vocabularyRichness,
    writing_pace,
    mentions_price: mentionsPrice,
    mentions_comparison: mentionsComparison,
    mentions_service: mentionsService,
    gives_advice: givesAdvice,
    sarcastic_tendency,
    uses_exclamations,
    uses_questions,
    avg_sentence_count,
    rating_variance: ratingVariance,
    recent_trend,
    category_expertise,
    nigerianStyle,
    summary,
    category_ratings
  }
}
