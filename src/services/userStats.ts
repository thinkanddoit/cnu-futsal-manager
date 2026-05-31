import { getDocs, collection, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { UserStats } from '../types'

const ATTENDANCE_POINTS = 0.5
const MOM_POINTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 }

function mergeCounts(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const result = { ...a }
  for (const [uid, n] of Object.entries(b)) result[uid] = (result[uid] ?? 0) + n
  return result
}

async function getMomCountsFromResults(allowedMatchIds: Set<string>) {
  const snap = await getDocs(collection(db, 'mvpResults'))
  const first: Record<string, number> = {}
  const second: Record<string, number> = {}
  const third: Record<string, number> = {}
  for (const d of snap.docs) {
    if (!allowedMatchIds.has(d.data().matchId)) continue
    for (const uid of (d.data().first ?? [])) first[uid] = (first[uid] ?? 0) + 1
    for (const uid of (d.data().second ?? [])) second[uid] = (second[uid] ?? 0) + 1
    for (const uid of (d.data().third ?? [])) third[uid] = (third[uid] ?? 0) + 1
  }
  return { first, second, third }
}

async function getMomCountsFromVotes(talliedMatchIds: Set<string>) {
  const snap = await getDocs(collection(db, 'mvpVotes'))
  const first: Record<string, number> = {}
  const second: Record<string, number> = {}
  const third: Record<string, number> = {}

  // matchId별 득표수 집계 (집계 완료된 경기만)
  const byMatch: Record<string, Record<string, number>> = {}
  for (const d of snap.docs) {
    const { matchId, votedFor } = d.data()
    if (!talliedMatchIds.has(matchId)) continue
    if (!byMatch[matchId]) byMatch[matchId] = {}
    byMatch[matchId][votedFor] = (byMatch[matchId][votedFor] ?? 0) + 1
  }

  // 경기별 순위 결정
  for (const voteCounts of Object.values(byMatch)) {
    const sorted = Object.entries(voteCounts)
      .map(([userId, votes]) => ({ userId, votes }))
      .sort((a, b) => b.votes - a.votes)
    let rank = 1
    let i = 0
    while (i < sorted.length && rank <= 3) {
      const cur = sorted[i].votes
      const tied: string[] = []
      while (i < sorted.length && sorted[i].votes === cur) tied.push(sorted[i++].userId)
      for (const uid of tied) {
        if (rank === 1) first[uid] = (first[uid] ?? 0) + 1
        else if (rank === 2) second[uid] = (second[uid] ?? 0) + 1
        else if (rank === 3) third[uid] = (third[uid] ?? 0) + 1
      }
      rank += tied.length
    }
  }

  return { first, second, third }
}

export async function calculateAllStats(): Promise<UserStats[]> {
  const [matchSnap, attendSnap] = await Promise.all([
    getDocs(query(collection(db, 'matches'), where('status', '==', 'completed'))),
    getDocs(query(collection(db, 'attendances'), where('status', '==', 'attending'))),
  ])

  const completedMatchIds = new Set(matchSnap.docs.map((d) => d.id))
  const talliedMatchIds = new Set(
    matchSnap.docs.filter((d) => d.data().voteTallied === true).map((d) => d.id)
  )
  // 위자드로 수동 등록한 경기(voteDeadline 없음)는 voteTallied 없어도 결과 허용
  const resultsAllowedMatchIds = new Set(
    matchSnap.docs
      .filter((d) => d.data().voteTallied === true || !d.data().voteDeadline)
      .map((d) => d.id)
  )

  const attendCount: Record<string, number> = {}
  for (const d of attendSnap.docs) {
    const { userId, matchId } = d.data()
    if (!userId || !completedMatchIds.has(matchId)) continue
    attendCount[userId] = (attendCount[userId] ?? 0) + 1
  }

  const [fromResults, fromVotes] = await Promise.all([
    getMomCountsFromResults(resultsAllowedMatchIds),
    getMomCountsFromVotes(talliedMatchIds),
  ])

  const mom1st = mergeCounts(fromResults.first, fromVotes.first)
  const mom2nd = mergeCounts(fromResults.second, fromVotes.second)
  const mom3rd = mergeCounts(fromResults.third, fromVotes.third)

  const allIds = new Set([
    ...Object.keys(attendCount),
    ...Object.keys(mom1st),
    ...Object.keys(mom2nd),
    ...Object.keys(mom3rd),
  ])

  return Array.from(allIds)
    .map((userId) => {
      const a = attendCount[userId] ?? 0
      const m1 = mom1st[userId] ?? 0
      const m2 = mom2nd[userId] ?? 0
      const m3 = mom3rd[userId] ?? 0
      return {
        userId,
        attendanceCount: a,
        mom1st: m1,
        mom2nd: m2,
        mom3rd: m3,
        totalPoints: a * ATTENDANCE_POINTS + m1 * MOM_POINTS[1] + m2 * MOM_POINTS[2] + m3 * MOM_POINTS[3],
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
}

export async function calculateUserStats(userId: string): Promise<UserStats> {
  const all = await calculateAllStats()
  return (
    all.find((s) => s.userId === userId) ?? {
      userId,
      totalPoints: 0,
      attendanceCount: 0,
      mom1st: 0,
      mom2nd: 0,
      mom3rd: 0,
    }
  )
}
