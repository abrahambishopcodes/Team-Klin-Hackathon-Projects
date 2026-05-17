import express from 'express'
import type Groq from 'groq-sdk'

import type { Logger } from '../logger.js'
import { buildLiveProfile } from '../domain/userProfile.js'
import { predictRating } from '../domain/rating.js'
import { buildStage1AnalysisPrompt, buildStage2GenerationPrompt, defaultAnalysis } from '../domain/prompts.js'
import { computeConfidenceScore } from '../simulate/confidence.js'
import { computeTargetWordRange, finalizeReview, reviewIssues } from '../domain/postProcess.js'
import { safeParseJsonObject } from '../utils/text.js'

type PineconeIndex = {
  searchRecords: (args: any) => Promise<any>
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

      const userProfile = buildLiveProfile(user_history, { log })

      const pineconeFields = [
        'user_id',
        'avg_rating',
        'harshness',
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

      const predictedRating = predictRating(userProfile as any, similarUsers)
      const start = Date.now()

      log.debug('Stage 1: analyzing user behavior...')
      const stage1Prompt = buildStage1AnalysisPrompt(user_history, target_item, predictedRating)
      let analysis = defaultAnalysis(predictedRating)

      try {
        const stage1 = await groq.chat.completions.create({
          model: groqModel,
          messages: [{ role: 'user', content: stage1Prompt }],
          max_tokens: 500,
          temperature: 0.3
        } as any)
        const stage1Text = stage1.choices?.[0]?.message?.content || ''
        const parsed = safeParseJsonObject(stage1Text)
        if (parsed) analysis = { ...analysis, ...(parsed as any) }
        else log.warn('Stage 1 JSON parse failed; using defaults.')
      } catch (e) {
        log.warn('Stage 1 request failed; using defaults.', e)
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
- Use normal paragraphs (1–3). Do NOT put every sentence on a new line.
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
          harshness: (userProfile as any).harshness,
          style_detected: (userProfile as any).is_nigerian
            ? `Nigerian Pidgin (${(userProfile as any).nigerian_intensity})`
            : 'Standard English',
          avg_review_length: (userProfile as any).avg_review_length
        }
      })
    } catch (e: any) {
      log.error('Simulate handler failed.', e)
      res.status(500).json({ error: e?.message || 'Unexpected error' })
    }
  })

  return router
}

