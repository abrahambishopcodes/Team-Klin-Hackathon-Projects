// ─── TYPES ────────────────────────────────────────────────────────────────────

export type SimilarUser = {
  avg_rating?: number
  harshness?: string
  review_count?: number
  categories?: string        // comma-separated e.g. "Beauty,Health"
  nigerian_intensity?: string
  similarity_score?: number  // 0-1, from Pinecone cosine similarity
}

export type CategoryRating = {
  category: string
  avg_rating: number
  review_count: number
}

export type RatingPredictionInput = {
  // Core stats
  avg_rating: number
  review_count: number
  rating_distribution: Record<string, number>  // { "1": 5, "2": 10, ... "5": 60 }
  rating_variance: number
  harshness: string

  // Behavioural signals
  recent_trend: string        // "trending positive" | "trending negative" | "stable"
  mentions_price: boolean
  gives_advice: boolean
  mentions_service: boolean
  vocabulary_richness: number
  sarcastic_tendency: boolean

  // Category affinity (most important new addition)
  category_ratings: CategoryRating[]   // user's avg per category from their history

  // Nigerian context
  is_nigerian: boolean
  nigerian_score: number
}

export type PredictionResult = {
  predicted_rating: number      // final 0.5-rounded rating
  raw_score: number             // pre-rounding float, useful for debugging
  confidence: number            // 0-100
  method_used: string           // explains how prediction was made
  breakdown: Record<string, number>  // each component's contribution
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const GLOBAL_AVG = 4.38         // from our Amazon dataset
const GLOBAL_STD = 1.12         // standard deviation across dataset

const DOMAIN_GROUPS: Record<string, string[]> = {
  personal_care: ['beauty', 'health', 'personal care', 'wellness', 'skincare'],
  tech: ['electronics', 'computer', 'phone', 'accessories', 'peripherals', 'gadget'],
  home: ['kitchen', 'home', 'appliances', 'dining', 'cooking'],
  fashion: ['clothing', 'footwear', 'apparel', 'shoes', 'fashion'],
  stationery: ['stationery', 'office', 'paper', 'pen', 'notebook'],
  handmade: ['handmade', 'craft', 'art', 'gift']
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function clamp(val: number, min = 1, max = 5): number {
  return Math.max(min, Math.min(max, val))
}

function roundHalf(val: number): number {
  return Math.round(val * 2) / 2
}

function getDomainGroup(category: string): string {
  const lower = category.toLowerCase()
  for (const [group, keywords] of Object.entries(DOMAIN_GROUPS)) {
    if (keywords.some(k => lower.includes(k))) return group
  }
  return 'unknown'
}

// Bayesian smoothing: blend a sample mean toward a prior
// as sample size grows, trust the sample more
// as sample size shrinks, fall back to prior
function bayesianBlend(
  sampleMean: number,
  sampleSize: number,
  prior: number,
  confidence: number = 10   // how many "virtual" reviews the prior is worth
): number {
  return ((sampleMean * sampleSize) + (prior * confidence)) / (sampleSize + confidence)
}

// Sigmoid to keep adjustments bounded — prevents stacking from blowing up
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

// ─── CATEGORY AFFINITY ────────────────────────────────────────────────────────
// Most important signal: how does THIS user rate THIS type of product?

function getCategoryAffinity(
  userProfile: RatingPredictionInput,
  targetCategory: string
): { affinity: number | null; confidence: number } {
  
  if (!userProfile.category_ratings || userProfile.category_ratings.length === 0) {
    return { affinity: null, confidence: 0 }
  }

  // Exact match first
  const exact = userProfile.category_ratings.find(
    c => c.category.toLowerCase() === targetCategory.toLowerCase()
  )
  if (exact) {
    // Even 1 review in this category is valuable signal
    // Confidence scales with review count: 1 review = 30, 2 = 45, 3+ = 60+
    const conf = exact.review_count === 1
      ? 30
      : Math.min(100, 30 + (exact.review_count * 15))
    return { affinity: exact.avg_rating, confidence: conf }
  }

  // Partial match (e.g. "Beauty" matches "All Beauty")
  const partial = userProfile.category_ratings.find(
    c => c.category.toLowerCase().includes(targetCategory.toLowerCase()) ||
         targetCategory.toLowerCase().includes(c.category.toLowerCase())
  )
  if (partial) {
    const conf = partial.review_count === 1 ? 20 : 40
    return { affinity: partial.avg_rating, confidence: conf }
  }

  return { affinity: null, confidence: 0 }
}

// ─── SIMILAR USER BLENDING ────────────────────────────────────────────────────
// Weight each similar user by their similarity score AND their review count
// A highly similar user with many reviews is far more valuable than
// a loosely similar user with 3 reviews

function blendSimilarUsers(
  similarUsers: SimilarUser[],
  targetCategory: string,
  globalAvg: number
): { blendedRating: number; effectiveSampleSize: number; categoryMatchCount: number } {
  
  if (similarUsers.length === 0) {
    return { blendedRating: globalAvg, effectiveSampleSize: 0, categoryMatchCount: 0 }
  }

  let weightedSum = 0
  let totalWeight = 0
  let categoryMatchCount = 0

  for (const user of similarUsers) {
    const rating = user.avg_rating || globalAvg
    const reviewCount = user.review_count || 3
    const similarity = user.similarity_score || 0.5

    // Base weight: cosine similarity from Pinecone (0-1)
    let weight = similarity

    // Boost weight if this user has reviewed the same category
    const userCategories = (user.categories || '').toLowerCase()
    const targetLower = targetCategory.toLowerCase()
    if (userCategories.includes(targetLower)) {
      weight *= 1.8   // 80% boost for category match
      categoryMatchCount++
    }

    // Detect domain mismatch and penalise heavily
    const targetDomain = getDomainGroup(targetCategory)
    const userCategoryDomain = getDomainGroup(user.categories || '')

    if (targetDomain !== 'unknown' &&
        userCategoryDomain !== 'unknown' &&
        targetDomain !== userCategoryDomain) {
      weight *= 0.25  // 75% penalty for completely wrong domain
    }

    // Scale by review count using log to prevent huge-corpus users dominating
    // log10(3)=0.48, log10(10)=1, log10(100)=2, log10(1000)=3
    const countWeight = Math.log10(Math.max(3, reviewCount))
    weight *= countWeight

    // Penalise similar users whose harshness diverges from target user
    // (we use this in the outer function, not here, but note it)

    weightedSum += rating * weight
    totalWeight += weight
  }

  const blendedRating = totalWeight > 0 ? weightedSum / totalWeight : globalAvg

  // Effective sample size for confidence calculation
  const effectiveSampleSize = Math.min(similarUsers.length * 3, 30)

  return { blendedRating, effectiveSampleSize, categoryMatchCount }
}

// ─── MAIN PREDICTION FUNCTION ─────────────────────────────────────────────────

export function predictRating(
  userProfile: RatingPredictionInput,
  similarUsers: SimilarUser[],
  targetCategory: string = ''
): PredictionResult {

  const breakdown: Record<string, number> = {}
  let confidence = 0

  // ── STEP 1: ESTABLISH BASE RATING ─────────────────────────────────────────
  // Use Bayesian smoothing to blend user's own average toward global average.
  // A user with 3 reviews should be pulled toward the global mean more than
  // a user with 200 reviews whose average we can trust.

  const userReviewCount = userProfile.review_count || 1
  
  // Prior is the global average, worth 10 "virtual" reviews
  const bayesianUserAvg = bayesianBlend(
    userProfile.avg_rating,
    userReviewCount,
    GLOBAL_AVG,
    10
  )
  breakdown['bayesian_user_avg'] = parseFloat(bayesianUserAvg.toFixed(3))

  // ── STEP 2: CATEGORY AFFINITY ─────────────────────────────────────────────
  // If user has reviewed this category before, use that as a strong signal

  const { affinity, confidence: affinityConf } = getCategoryAffinity(userProfile, targetCategory)
  
  let categoryAdjusted = bayesianUserAvg
  if (affinity !== null) {
    // Blend category-specific avg with overall avg
    // weight proportional to how many times they reviewed this category
    const affinityWeight = affinityConf / 100   // 0 to 1
    categoryAdjusted = (affinity * affinityWeight) + (bayesianUserAvg * (1 - affinityWeight))
    breakdown['category_affinity'] = parseFloat((affinity - bayesianUserAvg).toFixed(3))
    confidence += affinityConf * 0.3
  }

  // ── STEP 3: SIMILAR USER SIGNAL ───────────────────────────────────────────
  // Blend in what behaviourally similar users give this category

  const { blendedRating, effectiveSampleSize, categoryMatchCount } = 
    blendSimilarUsers(similarUsers, targetCategory, GLOBAL_AVG)

  // How much to trust similar users vs the individual user's own history?
  // Scale: if user has few reviews, trust similar users more
  //        if user has many reviews, trust their own history more
  const userTrustWeight = clamp(userReviewCount / (userReviewCount + 15), 0.3, 0.85)
  const similarUserWeight = 1 - userTrustWeight

  let base = (categoryAdjusted * userTrustWeight) + (blendedRating * similarUserWeight)
  breakdown['similar_user_blend'] = parseFloat((blendedRating * similarUserWeight).toFixed(3))
  breakdown['user_trust_weight'] = parseFloat(userTrustWeight.toFixed(3))

  // If category affinity fired AND similar users are wrong domain,
  // boost user's own history trust weight significantly
  const allUsersWrongDomain = categoryMatchCount === 0 &&
    similarUsers.length > 0 &&
    getDomainGroup(targetCategory) !== 'unknown'

  const adjustedUserTrustWeight = allUsersWrongDomain
    ? Math.min(0.85, userTrustWeight + 0.3)
    : userTrustWeight

  const adjustedSimilarWeight = 1 - adjustedUserTrustWeight

  // Recalculate base with adjusted weights
  base = (categoryAdjusted * adjustedUserTrustWeight) +
         (blendedRating * adjustedSimilarWeight)

  breakdown['domain_mismatch_correction'] = allUsersWrongDomain ? 0.3 : 0
  breakdown['adjusted_user_trust'] = parseFloat(adjustedUserTrustWeight.toFixed(3))
  confidence += Math.min(40, effectiveSampleSize * 1.5)
  confidence += categoryMatchCount * 5

  // ── STEP 4: BEHAVIOUR ADJUSTMENTS ─────────────────────────────────────────
  // Small, bounded adjustments derived from user's writing behaviour.
  // Each adjustment is scaled by sigmoid to prevent any single signal
  // from dominating. Total adjustments are capped at ±0.5

  let behaviourAdj = 0

  // Rating variance: high variance users are harder to predict
  // We compress the prediction toward 3 (midpoint) for high variance users
  const variance = userProfile.rating_variance || 0
  if (variance > 1.5) {
    const compressionStrength = Math.min((variance - 1.5) * 0.1, 0.2)
    behaviourAdj += (3 - base) * compressionStrength  // pull toward midpoint
    breakdown['variance_compression'] = parseFloat(((3 - base) * compressionStrength).toFixed(3))
  }

  // Recent trend: use a conservative adjustment
  // Only apply if user has enough reviews to establish a trend
  if (userReviewCount >= 4) {
    if (userProfile.recent_trend === 'trending positive') {
      behaviourAdj += 0.15
      breakdown['recent_trend'] = 0.15
    } else if (userProfile.recent_trend === 'trending negative') {
      behaviourAdj -= 0.12
      breakdown['recent_trend'] = -0.12
    }
  }

  // Sarcasm signal: user who writes positively but rates low
  // is likely to do so again — pull prediction down slightly
  if (userProfile.sarcastic_tendency) {
    behaviourAdj -= 0.2
    breakdown['sarcasm_penalty'] = -0.2
  }

  // Nigerian price sensitivity: Nigerians are often more price-vocal
  // and price-conscious in ratings when value is poor
  if (userProfile.is_nigerian && userProfile.mentions_price && userProfile.nigerian_score > 50) {
    behaviourAdj -= 0.1
    breakdown['nigerian_price_sensitivity'] = -0.1
  } else if (userProfile.mentions_price) {
    behaviourAdj -= 0.05
    breakdown['price_sensitivity'] = -0.05
  }

  // Cap total behaviour adjustments
  behaviourAdj = clamp(behaviourAdj, -0.5, 0.5)
  breakdown['total_behaviour_adj'] = parseFloat(behaviourAdj.toFixed(3))

  // ── STEP 5: COMBINE ───────────────────────────────────────────────────────

  let rawScore = base + behaviourAdj
  rawScore = clamp(rawScore, 1, 5)

  // ── STEP 6: RATING DISTRIBUTION SANITY CHECK ──────────────────────────────
  // If user NEVER gives the predicted star level, adjust toward their modal rating
  // e.g. if user only ever gives 1, 4, or 5 stars — a prediction of 2.5 is suspicious

  const dist = userProfile.rating_distribution || {}
  const totalReviews = Object.values(dist).reduce((a, b) => a + b, 0)
  
  if (totalReviews >= 5) {
    const roundedPrediction = Math.round(rawScore)
    const frequencyAtPredicted = (dist[roundedPrediction.toString()] || 0) / totalReviews
    
    if (frequencyAtPredicted < 0.05) {
      // User almost never gives this rating — find their modal rating
      const modal = Object.entries(dist)
        .sort(([, a], [, b]) => b - a)[0]
      const modalRating = parseInt(modal[0])
      
      // Blend 20% toward modal to avoid predictions the user never makes
      rawScore = rawScore * 0.8 + modalRating * 0.2
      rawScore = clamp(rawScore, 1, 5)
      breakdown['modal_correction'] = parseFloat((modalRating * 0.2).toFixed(3))
    }
  }

  // ── STEP 7: FINAL ROUNDING AND CONFIDENCE ─────────────────────────────────

  const finalRating = roundHalf(rawScore)
  
  // Confidence: starts at base, boosted by data quality
  confidence += Math.min(20, userReviewCount)   // more reviews = more confidence
  if (affinity !== null) confidence += 10        // category data available
  if (similarUsers.length >= 5) confidence += 10 // enough similar users
  confidence = clamp(Math.round(confidence), 10, 100)

  // Determine method used for transparency
  let method = 'global_average_fallback'
  if (similarUsers.length > 0 && affinity !== null) {
    method = 'category_affinity + similar_user_blend + behaviour_adjustment'
  } else if (affinity !== null) {
    method = 'category_affinity + behaviour_adjustment'
  } else if (similarUsers.length > 0) {
    method = 'similar_user_blend + behaviour_adjustment'
  } else if (userReviewCount >= 3) {
    method = 'user_history_bayesian + behaviour_adjustment'
  }

  breakdown['raw_before_rounding'] = parseFloat(rawScore.toFixed(3))
  breakdown['final_rating'] = finalRating

  return {
    predicted_rating: finalRating,
    raw_score: parseFloat(rawScore.toFixed(3)),
    confidence,
    method_used: method,
    breakdown
  }
}
