import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { MomVote } from '../types'

function voteId(matchId: string, voterId: string) {
  return `${matchId}_${voterId}`
}

function docToVote(data: Record<string, any>): MomVote {
  return {
    matchId: data.matchId,
    voterId: data.voterId,
    votedFor: data.votedFor,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

export async function castMomVote(
  matchId: string,
  voterId: string,
  votedFor: string
): Promise<void> {
  if (voterId === votedFor) throw new Error('자기 자신에게 투표할 수 없습니다.')
  const id = voteId(matchId, voterId)
  await setDoc(doc(db, 'mvpVotes', id), {
    matchId,
    voterId,
    votedFor,
    createdAt: Timestamp.now(),
  })
}

export async function getVotesForMatch(matchId: string): Promise<MomVote[]> {
  const q = query(collection(db, 'mvpVotes'), where('matchId', '==', matchId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToVote(d.data()))
}

export async function computeMomResultFromVotes(matchId: string): Promise<{ first: string[]; second: string[]; third: string[] } | null> {
  const votes = await getVotesForMatch(matchId)
  if (votes.length === 0) return null

  const counts: Record<string, number> = {}
  for (const v of votes) counts[v.votedFor] = (counts[v.votedFor] ?? 0) + 1

  const sorted = Object.entries(counts)
    .map(([userId, n]) => ({ userId, n }))
    .sort((a, b) => b.n - a.n)

  const result: { first: string[]; second: string[]; third: string[] } = { first: [], second: [], third: [] }
  let rank = 1
  let i = 0
  while (i < sorted.length && rank <= 3) {
    const cur = sorted[i].n
    const tied: string[] = []
    while (i < sorted.length && sorted[i].n === cur) tied.push(sorted[i++].userId)
    if (rank === 1) result.first = tied
    else if (rank === 2) result.second = tied
    else result.third = tied
    rank += tied.length
  }
  return result
}

export async function getMyVote(matchId: string, voterId: string): Promise<MomVote | null> {
  const id = voteId(matchId, voterId)
  const snap = await getDocs(query(collection(db, 'mvpVotes'), where('__name__', '==', id)))
  if (snap.empty) return null
  return docToVote(snap.docs[0].data())
}
