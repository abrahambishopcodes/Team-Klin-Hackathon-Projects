import { sanitizeText } from '../utils/text.js'

export type NigerianStyle = {
  isNigerian: boolean
  nigerianScore: number
  intensity: 'none' | 'low' | 'medium' | 'high'
  usesDeyVerb: boolean
  usesNaConnector: boolean
  usesRepetition: boolean
  usesAllCaps: boolean
  nigerianSentenceEndings: number
  referencesNaira: boolean
  referencesSocialProof: boolean
  nigerianExamples: string[]
  styleInstruction: string
}

export function analyseNigerianStyle(reviews: Array<{ text?: string }>): NigerianStyle {
  const allText = reviews.map(r => r.text || '').join(' ').toLowerCase()
  const allReviews = reviews.map(r => r.text || '').filter(t => t.length > 0)

  if (allReviews.length === 0) {
    return {
      isNigerian: false,
      nigerianScore: 0,
      intensity: 'none',
      usesDeyVerb: false,
      usesNaConnector: false,
      usesRepetition: false,
      usesAllCaps: false,
      nigerianSentenceEndings: 0,
      referencesNaira: false,
      referencesSocialProof: false,
      nigerianExamples: [],
      styleInstruction: ''
    }
  }

  let score = 0

  const corePidginWords = [
    'abeg', 'omo', 'wahala', 'wetin', 'dey', 'sha', 'naija',
    'dem', 'sabi', 'wella', 'kukuma', 'yawa', 'gbas gbos', 'e don', 'no be', 'na im'
  ]
  score += corePidginWords.filter(w => allText.includes(w)).length * 3

  const culturalRefs = [
    'jollof', 'suya', 'eba', 'pepper soup', 'naira', '₦',
    'lagos', 'abuja', 'nafdac', 'konga', 'jumia'
  ]
  score += culturalRefs.filter(w => allText.includes(w)).length * 2

  const expressions = [
    'e dey', 'e don do', 'correct na', 'e be like', 'no be small',
    'e shock me', 'i no go lie', 'make i tell you', 'as e be', 'the thing wey',
    'e go spoil', 'no small thing', 'e fresh'
  ]
  score += expressions.filter(e => allText.includes(e)).length * 3

  let nigerianSentenceEndings = 0
  const sentences = allText.match(/[^.!?]+[.!?]/g) || []
  for (const sent of sentences) {
    const trimmed = sent.trim()
    const ends = (re: RegExp) => re.test(trimmed) || re.test(trimmed.replace(/[.!?]\s*$/, ''))
    if (ends(/\bo\s*[.!?]\s*$/) || ends(/\bsha\s*[.!?]\s*$/) || ends(/\boo\s*[.!?]\s*$/) || ends(/\bna\s*[.!?]\s*$/)) {
      nigerianSentenceEndings++
      score += 2
    }
  }

  const usesDeyVerb = /\b(dey|deys)\b/.test(allText) && /(e dey|i dey|it dey|product dey|they dey)/i.test(allText)
  if (usesDeyVerb) score += 4

  const usesNaConnector = /\bna\b/i.test(allText) && /(na lie|na so|na the|na just|na true)/i.test(allText)
  if (usesNaConnector) score += 3

  const usesRepetition = /\b(\w+)\s+\1\b/i.test(allText)
  if (usesRepetition) score += 3

  const usesAllCaps = allReviews.some(t => (t.match(/\b[A-Z]{2,}\b/g) || []).length > 0)
  if (usesAllCaps) score += 2

  const referencesNaira = /naira|₦|kobo/i.test(allText)
  if (referencesNaira) score += 4

  const socialProofKeywords = [
    'my friend', 'my sister', 'my oga', 'everybody',
    'people dey', 'them say', 'i hear say', 'my brother', 'as we dey say'
  ]
  const referencesSocialProof = socialProofKeywords.some(k => allText.includes(k))
  if (referencesSocialProof) score += 2

  const nigerianScore = Math.min(100, Math.max(0, score))
  const isNigerian = nigerianScore >= 15

  let intensity: NigerianStyle['intensity'] = 'none'
  if (nigerianScore >= 60) intensity = 'high'
  else if (nigerianScore >= 30) intensity = 'medium'
  else if (nigerianScore >= 15) intensity = 'low'

  const nigerianExamples: string[] = []
  const scoredSentences = sentences
    .map(s => s.trim())
    .map(text => {
      let sentScore = 0
      if (corePidginWords.some(w => text.includes(w))) sentScore += 3
      if (expressions.some(e => text.includes(e))) sentScore += 3
      if (/\b(dey|sha|na|o|oo)\b/i.test(text)) sentScore += 2
      return { text, score: sentScore }
    })
    .sort((a, b) => b.score - a.score)

  for (let i = 0; i < Math.min(3, scoredSentences.length); i++) {
    if (scoredSentences[i].score > 0) nigerianExamples.push(sanitizeText(scoredSentences[i].text, 200))
  }

  let styleInstruction = ''
  if (isNigerian) {
    const components: string[] = [`Write in Nigerian Pidgin English with ${intensity} intensity.`]
    if (nigerianSentenceEndings > 0) components.push(`End some sentences with 'o', 'sha', or 'oo' naturally (${nigerianSentenceEndings} patterns detected).`)
    if (usesDeyVerb) components.push(`Use 'dey' as a verb naturally instead of 'is/are' (e.g., 'e dey work', 'it dey work').`)
    if (usesNaConnector) components.push(`Use 'na' as a connector naturally (e.g., 'na so', 'na lie').`)
    if (usesRepetition) components.push(`Repeat words for emphasis occasionally (e.g., 'very very', 'good good').`)
    if (referencesNaira) components.push('Reference value for money in Nigerian Naira terms when discussing price.')
    if (nigerianExamples.length > 0) components.push(`Example phrases from this user: ${nigerianExamples.map(e => `"${e}"`).join(', ')}.`)
    styleInstruction = components.join(' ')
  }

  return {
    isNigerian,
    nigerianScore: Math.round(nigerianScore),
    intensity,
    usesDeyVerb,
    usesNaConnector,
    usesRepetition,
    usesAllCaps,
    nigerianSentenceEndings,
    referencesNaira,
    referencesSocialProof,
    nigerianExamples,
    styleInstruction
  }
}

