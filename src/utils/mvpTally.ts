export interface VoteCount {
  userId: string
  votes: number
}

export interface TallyResult {
  userId: string
  rank: number
  points: number
}

const POINTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 }

export function tallyMvpVotes(voteCounts: VoteCount[]): TallyResult[] {
  if (voteCounts.length === 0) return []

  const sorted = [...voteCounts].sort((a, b) => b.votes - a.votes)
  const results: TallyResult[] = []
  let rank = 1
  let i = 0

  while (i < sorted.length && rank <= 3) {
    const currentVotes = sorted[i].votes
    const tied: VoteCount[] = []

    while (i < sorted.length && sorted[i].votes === currentVotes) {
      tied.push(sorted[i])
      i++
    }

    for (const t of tied) {
      if (rank <= 3) {
        results.push({ userId: t.userId, rank, points: POINTS[rank] })
      }
    }

    rank += tied.length
  }

  return results
}
