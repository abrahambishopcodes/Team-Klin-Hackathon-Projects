export type SimilarUser = { avg_rating?: number; harshness?: string }
export type BasicUserProfile = { avg_rating?: number; harshness?: string }

export function predictRating(userProfile: BasicUserProfile, similarUsers: SimilarUser[]): number {
  const globalAvg = 4.38
  const userBias = (userProfile.avg_rating || 0) - globalAvg

  let base = globalAvg
  if (similarUsers.length > 0) {
    const similarAvg = similarUsers.reduce((a, u) => a + (u.avg_rating || globalAvg), 0) / similarUsers.length
    base = similarAvg
  }

  let predicted = base + userBias
  if (userProfile.harshness === 'harsh') predicted -= 0.2
  if (userProfile.harshness === 'generous') predicted += 0.2

  predicted = Math.max(1, Math.min(5, predicted))
  predicted = Math.round(predicted * 2) / 2
  return predicted
}

