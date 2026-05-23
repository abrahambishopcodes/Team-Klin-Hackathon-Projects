export function computeConfidenceScore(
  similarUsersCount: number,
  { categoryMatch, hasTargetCategory }: { categoryMatch: boolean; hasTargetCategory: boolean }
): number {
  // Base score from similar users (1 user = 12%, 10 users = 85%)
  let score = Math.round(similarUsersCount * 8.5)
  score = Math.min(85, score)

  // Category matching is the strongest signal
  if (hasTargetCategory) {
    score = categoryMatch ? Math.min(92, score + 12) : Math.min(75, score + 5)
  } else {
    score = Math.min(78, score)
  }

  // Penalize if we have too few similar users
  if (similarUsersCount < 2) score = Math.min(55, score)
  else if (similarUsersCount < 4) score = Math.min(70, score)
  
  // Cap at 90% since 99% is unrealistic - always some uncertainty in ML
  return Math.max(40, Math.min(90, score))
}

