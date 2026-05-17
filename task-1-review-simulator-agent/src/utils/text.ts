export function sanitizeText(text: unknown, maxLen = 400): string {
  if (!text) return ''
  return String(text)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

export function wordCount(text: unknown): number {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length
}

export function clipToMaxWords(text: unknown, maxWords: number): string {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return String(text || '').trim()
  return words.slice(0, maxWords).join(' ').replace(/[,\s]+$/g, '').trim()
}

export function normalizeLineBreaks(text: unknown): string {
  const raw = String(text || '').replace(/\r\n/g, '\n')
  const paragraphs = raw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return ''

  const normalizePara = (para: string): string => {
    const lines = para.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length <= 1) return para.trim()

    const punctEnds = lines.filter(l => /[.!?]$/.test(l)).length
    const manyShortLines = lines.filter(l => l.length <= 90).length
    const oneSentencePerLine = punctEnds / lines.length >= 0.6 && manyShortLines / lines.length >= 0.6
    return oneSentencePerLine ? lines.join(' ').replace(/\s{2,}/g, ' ').trim() : lines.join(' ')
  }

  return paragraphs.map(normalizePara).join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function safeParseJsonObject(text: unknown): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(String(text || '').trim())
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
  } catch {
    // ignore
  }
  return null
}

