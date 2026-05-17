export function computeConfidenceScore(
  similarUsersCount: number,
  { categoryMatch, hasTargetCategory }: { categoryMatch: boolean; hasTargetCategory: boolean }
): number {
  let score = Math.round(similarUsersCount * 8)
  score = Math.min(85, score)

  if (hasTargetCategory) score = categoryMatch ? Math.min(95, score + 10) : Math.min(70, score)
  else score = Math.min(80, score)

  if (similarUsersCount < 3) score = Math.min(60, score)
  return Math.max(0, Math.min(95, score))
}

