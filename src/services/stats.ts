import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase'

const MOM_POINTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 }

export async function tallyMatch(matchId: string): Promise<void> {
  const matchRef = doc(db, 'matches', matchId)
  const matchSnap = await getDoc(matchRef)
  if (!matchSnap.exists()) throw new Error('Match not found')
  const { status, voteTallied } = matchSnap.data()
  if (status !== 'completed') throw new Error('Match not completed')
  if (voteTallied) return

  const updates: Array<Promise<void>> = []

  function addStats(userId: string, fields: Record<string, any>) {
    updates.push(setDoc(doc(db, 'userStats', userId), fields, { merge: true }))
  }

  // 1. 출석 점수
  const attendSnap = await getDocs(
    query(
      collection(db, 'attendances'),
      where('matchId', '==', matchId),
      where('status', '==', 'attending')
    )
  )
  for (const a of attendSnap.docs) {
    const { userId } = a.data()
    if (!userId) continue
    addStats(userId, { totalPoints: increment(1), attendanceCount: increment(1) })
  }

  // 2. MOM 점수 — mvpVotes 우선, 없으면 mvpResults(수동 등록) 사용
  const voteSnap = await getDocs(
    query(collection(db, 'mvpVotes'), where('matchId', '==', matchId))
  )

  if (voteSnap.size > 0) {
    const voteCounts: Record<string, number> = {}
    for (const v of voteSnap.docs) {
      const { votedFor } = v.data()
      voteCounts[votedFor] = (voteCounts[votedFor] ?? 0) + 1
    }
    const sorted = Object.entries(voteCounts)
      .map(([userId, votes]) => ({ userId, votes }))
      .sort((a, b) => b.votes - a.votes)

    let rank = 1
    let i = 0
    while (i < sorted.length && rank <= 3) {
      const currentVotes = sorted[i].votes
      const tied: string[] = []
      while (i < sorted.length && sorted[i].votes === currentVotes) {
        tied.push(sorted[i].userId)
        i++
      }
      for (const userId of tied) {
        if (rank <= 3) {
          const rankField = rank === 1 ? 'mom1st' : rank === 2 ? 'mom2nd' : 'mom3rd'
          addStats(userId, {
            totalPoints: increment(MOM_POINTS[rank]),
            [rankField]: increment(1),
          })
        }
      }
      rank += tied.length
    }
  } else {
    const resultSnap = await getDocs(
      query(collection(db, 'mvpResults'), where('matchId', '==', matchId))
    )
    if (!resultSnap.empty) {
      const result = resultSnap.docs[0].data()
      const tiers: Array<[string[], number]> = [
        [result.first ?? [], 1],
        [result.second ?? [], 2],
        [result.third ?? [], 3],
      ]
      for (const [uids, rank] of tiers) {
        for (const userId of uids) {
          const rankField = rank === 1 ? 'mom1st' : rank === 2 ? 'mom2nd' : 'mom3rd'
          addStats(userId, {
            totalPoints: increment(MOM_POINTS[rank]),
            [rankField]: increment(1),
          })
        }
      }
    }
  }

  updates.push(updateDoc(matchRef, { voteTallied: true }))
  await Promise.all(updates)
}

// AdminMatchesPage 호환성 유지
export async function triggerMatchTally(matchId: string): Promise<void> {
  await tallyMatch(matchId)
}
