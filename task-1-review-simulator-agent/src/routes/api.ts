import express from 'express'
import type Groq from 'groq-sdk'

import type { Logger } from '../logger.js'
import { buildLiveProfile } from '../domain/userProfile.js'
import { predictRating } from '../domain/rating.js'
import type { RatingPredictionInput } from '../domain/rating.js'
import { buildStage2GenerationPrompt, defaultAnalysis } from '../domain/prompts.js'
import { computeConfidenceScore } from '../simulate/confidence.js'
import { computeTargetWordRange, finalizeReview, reviewIssues } from '../domain/postProcess.js'
import { safeParseJsonObject, sanitizeText } from '../utils/text.js'

type PineconeIndex = {
  searchRecords: (args: any) => Promise<any>
}

type DirectHistoryResult =
  | { found: true; rating: number; review: string }
  | { found: false }

function checkDirectHistory(
  userHistory: Array<{ item?: string; stars?: number | string; text?: string }>,
  targetItem: { name?: string }
): DirectHistoryResult {
  const targetName = (targetItem.name || '').toLowerCase().trim()
  if (!targetName) return { found: false }

  for (const review of userHistory) {
    const itemName = (review.item || '').toLowerCase().trim()
    if (!itemName) continue

    const exactMatch = itemName === targetName
    const partialMatch = itemName.includes(targetName) ||
      targetName.includes(itemName)

    const targetWords = targetName.split(/\s+/).filter(w => w.length > 2)
    const matchedWords = targetWords.filter(w => itemName.includes(w))
    const wordOverlap = targetWords.length > 0 &&
      (matchedWords.length / targetWords.length) >= 0.6

    if (exactMatch || partialMatch || wordOverlap) {
      const rating = parseFloat(String(review.stars ?? '')) || 0
      if (rating > 0) {
        return { found: true, rating, review: review.text || '' }
      }
    }
  }

  return { found: false }
}

function buildBehaviourPatternPrompt(userHistory: any[], targetItem: any, userProfile: any): string {
  return `You are a behavioural analyst studying how a specific
person rates products. Your job is to find the patterns
behind their ratings, not just the averages.

USER REVIEW HISTORY (read every single one carefully):
${userHistory.slice(0, 8).map((r, i) => `
[Review ${i + 1}]
Product: ${r.item || 'Unknown'}
Category: ${r.category || 'Unknown'}
Stars given: ${r.stars}/5
Text: "${sanitizeText(r.text || '', 400)}"
`).join('\n')}

TARGET PRODUCT:
Name: ${sanitizeText(targetItem.name || '', 100)}
Category: ${sanitizeText(targetItem.category || '', 80)}
Description: ${sanitizeText(targetItem.description || '', 400)}
Price: ${targetItem.price || 'Not specified'}

USER STATISTICS (for context only — do not let these
dominate your reasoning. The patterns in the text matter
more than the averages):
Overall average rating: ${userProfile.avg_rating}/5
Rating style: ${userProfile.harshness}
Total reviews: ${userProfile.review_count}
Mentions price frequently: ${userProfile.mentions_price}
Nigerian writing style: ${userProfile.nigerianStyle?.isNigerian ? `Yes, ${userProfile.nigerianStyle.intensity} intensity` : 'No'}

YOUR ANALYSIS PROCESS:

Step 1 — Read every review in the history.
For each high rating (4-5 stars), ask: what specifically
made this user happy? Was it build quality? Value for money?
Exceeding expectations? Ease of use? Something else?
For each low rating (1-2 stars), ask: what specifically
went wrong for this user? Durability? Setup complexity?
Misleading description? Poor value? Something else?
For mid ratings (3 stars), ask: what was missing?

Step 2 — Find the cross-category patterns.
Do not just say "they rate electronics harshly."
Find the actual reason. Examples:
- "User punishes products that fail within weeks regardless of category"
- "User rewards products where quality exceeds price expectation"
- "User is harsh when setup requires technical knowledge"
- "User forgives price but never forgives misleading descriptions"
- "User rates higher when product solves a specific pain point they mention"

Step 3 — Map target product to those patterns.
Look at the target product's description carefully.
Does it show signs of the traits this user rewards?
Does it show signs of the traits this user punishes?
Be specific — quote from their reviews to justify your mapping.

Step 4 — Decide the adjustment.
Based purely on the pattern match, what numeric adjustment
should be applied to this user's average rating?

Step 5 — Decide whether the behavioural pattern should override
the mathematical baseline. Only set should_override_math to true
when the review history gives strong textual evidence that the
target product will clearly trigger this user's reward or punishment
pattern. If the evidence is thin, mixed, or category-only, keep it false.

rating_adjustment rules:
+1.5 to +2.0 = strong match with user's reward patterns,
               product very likely to exceed their expectations
+0.5 to +1.5 = moderate match, product seems to hit things they love
-0.5 to +0.5 = no clear signal, product does not strongly match
               either reward or punishment patterns
-0.5 to -1.5 = moderate mismatch, product seems to have traits they punish
-1.5 to -2.0 = strong mismatch, product very likely to disappoint this user

adjustment_confidence rules:
0.0 to 0.4 = weak evidence, mostly inference or not enough reviews
0.4 to 0.7 = moderate evidence, some clear pattern but not decisive
0.7 to 1.0 = strong evidence from repeated review text or a very clear target match

should_override_math rules:
true = the text pattern is strong enough that the mathematical baseline
       is probably misleading for this target product
false = keep the mathematical baseline dominant and use rating_adjustment
        as a normal weighted adjustment

Respond ONLY in valid JSON. No text outside the JSON.
No markdown. No backticks. No explanation outside the JSON.

{
  "high_rating_pattern": "string — what specifically drives this user's 4-5 star ratings across their history. Be concrete, not generic.",
  "low_rating_pattern": "string — what specifically drives this user's 1-2 star ratings. Be concrete, not generic.",
  "cross_category_behaviour": "string — the deeper behavioural pattern that explains their ratings regardless of product type",
  "target_product_strengths": "string — specific traits of the target product that match what this user rewards, with reference to their actual reviews",
  "target_product_risks": "string — specific traits of the target product that match what this user punishes, with reference to their actual reviews",
  "pattern_match_verdict": "strong_match OR moderate_match OR neutral OR moderate_mismatch OR strong_mismatch",
  "rating_adjustment": number between -2.0 and 2.0,
  "adjustment_confidence": number between 0.0 and 1.0,
  "should_override_math": boolean,
  "adjustment_reasoning": "string — specific explanation referencing actual reviews from their history. Do not be vague.",
  "cares_about": "string — what this user values most",
  "five_star_trigger": "string — what makes them give 5 stars",
  "one_star_trigger": "string — what makes them give 1 star",
  "personality": "string — their reviewer personality in one sentence",
  "writing_traits": "string — writing style, length, tone, vocabulary patterns",
  "would_focus_on": "string — what aspects of the target product they would specifically comment on",
  "predicted_sentiment": "positive OR mixed OR negative"
}`
}

export function createApiRouter({
  index,
  groq,
  groqModel,
  log
}: {
  index: PineconeIndex
  groq: Groq
  groqModel: string
  log: Logger
}) {
  const router = express.Router()

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Review Simulator API is running' })
  })

  router.post('/simulate', async (req, res) => {
    try {
      const { user_history, target_item } = req.body as any

      if (!Array.isArray(user_history) || user_history.length === 0) {
        return res.status(400).json({ error: 'user_history is required and must be a non-empty array' })
      }
      if (!target_item?.name) {
        return res.status(400).json({ error: 'target_item with a name is required' })
      }

      const directMatch = checkDirectHistory(user_history, target_item)
      if (directMatch.found) {
        return res.json({
          predicted_rating: directMatch.rating,
          simulated_review: directMatch.review ||
            `User previously rated this product ${directMatch.rating} stars.`,
          confidence_score: 100,
          analysis: defaultAnalysis(directMatch.rating),
          reasoning: {
            similar_users_found: 0,
            category_match: false,
            user_bias: 0,
            harshness: 'known history',
            style_detected: 'N/A',
            avg_review_length: directMatch.review?.length || 0,
            prediction_method: 'direct_history_match',
            note: 'Product found in user history. Returning actual rating.'
          }
        })
      }

      const userProfile = buildLiveProfile(user_history, { log })

      const pineconeFields = [
        'user_id',
        'avg_rating',
        'harshness',
        'review_count',
        'categories',
        'is_nigerian',
        'nigerian_intensity',
        'sample_reviews',
        'profile_summary'
      ]

      const targetCategoryRaw = String(target_item.category || '').trim()
      let categoryMatch = false
      let similarUsers: any[] = []

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
          const filteredUsers = filtered.result?.hits?.map((h: any) => h.fields) || []
          if (filteredUsers.length >= 3) {
            similarUsers = filteredUsers
            categoryMatch = true
          }
        } catch (e) {
          log.warn('Pinecone filtered search failed; falling back to unfiltered search.', e)
        }
      }

      if (similarUsers.length < 3) {
        const searchResults = await index.searchRecords({
          query: { inputs: { text: userProfile.summary }, topK: 10 },
          fields: pineconeFields
        })
        similarUsers = searchResults.result?.hits?.map((h: any) => h.fields) || []
        categoryMatch = false
      }

      const predictionInput: RatingPredictionInput = {
        avg_rating: userProfile.avg_rating,
        review_count: userProfile.review_count,
        rating_distribution: userProfile.rating_distribution,
        rating_variance: userProfile.rating_variance,
        harshness: userProfile.harshness,
        recent_trend: userProfile.recent_trend,
        mentions_price: userProfile.mentions_price,
        gives_advice: userProfile.gives_advice,
        mentions_service: userProfile.mentions_service,
        vocabulary_richness: userProfile.vocabulary_richness,
        sarcastic_tendency: userProfile.sarcastic_tendency,
        category_ratings: userProfile.category_ratings,
        is_nigerian: userProfile.nigerianStyle?.isNigerian ?? false,
        nigerian_score: userProfile.nigerianStyle?.nigerianScore ?? 0
      }

      const start = Date.now()

      log.debug('Stage 1: analyzing user behavior...')
      const stage1Prompt = buildBehaviourPatternPrompt(user_history, target_item, userProfile)
      let analysis = {
        ...defaultAnalysis(userProfile.avg_rating),
        high_rating_pattern: '',
        low_rating_pattern: '',
        cross_category_behaviour: '',
        target_product_strengths: '',
        target_product_risks: '',
        pattern_match_verdict: 'neutral',
        rating_adjustment: 0,
        adjustment_confidence: 0,
        should_override_math: false,
        adjustment_reasoning: ''
      }
      let llmAdjustment = 0
      let clampedAdj = 0
      let adjustmentConfidence = 0
      let shouldOverrideMath = false

      try {
        const stage1 = await groq.chat.completions.create({
          model: groqModel,
          messages: [{ role: 'user', content: stage1Prompt }],
          max_tokens: 1200,
          temperature: 0.3
        } as any)
        const stage1Text = stage1.choices?.[0]?.message?.content || ''
        const parsed = safeParseJsonObject(stage1Text)
        if (parsed) {
          analysis = { ...analysis, ...(parsed as any) }
          llmAdjustment = parseFloat(String((parsed as any).rating_adjustment)) || 0
          clampedAdj = Math.max(-2.0, Math.min(2.0, llmAdjustment))
          adjustmentConfidence = Math.max(0, Math.min(1, parseFloat(String((parsed as any).adjustment_confidence)) || 0))
          shouldOverrideMath = (parsed as any).should_override_math === true ||
            String((parsed as any).should_override_math).toLowerCase() === 'true'
        } else {
          log.warn('Stage 1 JSON parse failed; using defaults.')
        }
      } catch (e) {
        log.warn('Stage 1 request failed; using defaults.', e)
      }

      const predictedRatingResult = predictRating(
        predictionInput,
        similarUsers,
        target_item?.category || '',
        clampedAdj,
        {
          confidenceInAdjustment: adjustmentConfidence,
          shouldOverrideMath,
          patternMatchVerdict: String(analysis.pattern_match_verdict || '')
        }
      )
      const predictedRating = predictedRatingResult.predicted_rating
      const weightedLLMAdj = Number(predictedRatingResult.breakdown.llm_behaviour_pattern_adj) || 0
      predictedRatingResult.breakdown = {
        ...predictedRatingResult.breakdown,
        pattern_match: analysis.pattern_match_verdict
      }

      log.debug('Stage 2: generating review...')
      const wordRange = computeTargetWordRange(user_history)
      const stage2Prompt = buildStage2GenerationPrompt(
        user_history,
        userProfile as any,
        analysis,
        similarUsers,
        target_item,
        predictedRating
      )

      let simulatedReview = ''
      try {
        const stage2 = await groq.chat.completions.create({
          model: groqModel,
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
        } as any)
        simulatedReview = (stage2.choices?.[0]?.message?.content || '').trim()
      } catch (e) {
        log.error('Stage 2 generation failed.', e)
        return res.status(500).json({ error: 'Failed to generate simulated review. Please try again.' })
      }

      const firstCheck = reviewIssues(simulatedReview, wordRange)
      if (firstCheck.issues.length > 0) {
        try {
          const retry = await groq.chat.completions.create({
            model: groqModel,
            messages: [{
              role: 'user',
              content: `Rewrite the review below to match the user's real style.

Hard requirements:
- Output ONLY the review text, nothing else
- Keep it between ${wordRange.min} and ${wordRange.max} words (aim ~${wordRange.predicted})
- Use normal paragraphs (1–3). Do NOT put every sentence on a line.
- Be specific (mention concrete issues/details), avoid generic lines
- Avoid these words/phrases: "hassle", "seamless", "game-changer", "top-notch", "must-have", "blew me away", "changed my life", "highly recommend"

Original review:
${simulatedReview}`
            }],
            max_tokens: Math.min(800, Math.max(180, Math.round(wordRange.max * 2))),
            temperature: 0.85
          } as any)
          simulatedReview = (retry.choices?.[0]?.message?.content || '').trim()
        } catch (e) {
          log.warn('Stage 2 retry failed; using first output.', e)
        }
      }

      simulatedReview = finalizeReview(simulatedReview, wordRange)
      log.debug(`Simulation finished in ${Date.now() - start}ms`)

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
          user_bias: Number(((Number((userProfile as any).avg_rating || 0) - 4.38)).toFixed(2)),
          harshness: userProfile.harshness,
          style_detected: userProfile.nigerianStyle?.isNigerian
            ? `Nigerian Pidgin (${userProfile.nigerianStyle.intensity})`
            : 'Standard English',
          avg_review_length: userProfile.avg_review_length,
          high_rating_pattern: analysis.high_rating_pattern,
          low_rating_pattern: analysis.low_rating_pattern,
          cross_category_behaviour: analysis.cross_category_behaviour,
          target_product_strengths: analysis.target_product_strengths,
          target_product_risks: analysis.target_product_risks,
          pattern_match_verdict: analysis.pattern_match_verdict,
          adjustment_reasoning: analysis.adjustment_reasoning,
          adjustment_confidence: adjustmentConfidence,
          should_override_math: shouldOverrideMath,
          llm_adjustment_applied: weightedLLMAdj,
          prediction_breakdown: predictedRatingResult.breakdown,
          prediction_method: predictedRatingResult.method_used,
          raw_score: predictedRatingResult.raw_score,
          prediction_confidence: predictedRatingResult.confidence
        }
      })
    } catch (e: any) {
      log.error('Simulate handler failed.', e)
      res.status(500).json({ error: e?.message || 'Unexpected error' })
    }
  })

  return router
}
