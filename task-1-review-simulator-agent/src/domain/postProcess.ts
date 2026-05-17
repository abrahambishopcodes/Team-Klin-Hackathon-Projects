import { clipToMaxWords, normalizeLineBreaks, wordCount } from '../utils/text.js'

export type WordRange = { predicted: number; min: number; max: number; stats: { avgWords: number; stdWords: number; minWords: number; maxWords: number } }

export function computeUserWordStats(userHistory: Array<{ text?: string }>) {
  const counts = (userHistory || []).map(r => wordCount(r?.text)).filter(n => Number.isFinite(n) && n > 0)
  if (counts.length === 0) return { avgWords: 0, stdWords: 0, minWords: 0, maxWords: 0 }

  const avgWords = counts.reduce((a, b) => a + b, 0) / counts.length
  const variance = counts.reduce((acc, n) => acc + Math.pow(n - avgWords, 2), 0) / counts.length
  const stdWords = Math.sqrt(variance)

  return { avgWords, stdWords, minWords: Math.min(...counts), maxWords: Math.max(...counts) }
}

export function computeTargetWordRange(userHistory: Array<{ text?: string }>): WordRange {
  const stats = computeUserWordStats(userHistory)
  const avg = stats.avgWords || 0
  const std = stats.stdWords || 0

  const predicted = Math.round(avg * 0.9 + Math.min(12, avg * 0.1))
  const min = Math.max(25, Math.round(predicted - Math.max(12, std)))
  const max = Math.min(220, Math.round(predicted + Math.max(18, std)))

  return { predicted, min, max, stats }
}

export function deCliche(text: unknown): string {
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

export function reviewIssues(text: unknown, wordRange: { min: number }) {
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

  const issues: string[] = []
  if (tooShort) issues.push('too_short')
  if (tooFlat) issues.push('too_flat')
  if (hasBanned) issues.push('banned_words')
  return { issues, words, sentences }
}

export function finalizeReview(text: unknown, wordRange: { max: number }): string {
  let out = normalizeLineBreaks(text)
  out = deCliche(out)
  out = clipToMaxWords(out, wordRange.max)
  out = normalizeLineBreaks(out)
  return out
}

