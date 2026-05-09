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
import { MvpVote } from '../types'

function voteId(matchId: string, voterId: string) {
  return `${matchId}_${voterId}`
}

function docToVote(data: Record<string, any>): MvpVote {
  return {
    matchId: data.matchId,
    voterId: data.voterId,
    votedFor: data.votedFor,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

export async function castMvpVote(
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

export async function getVotesForMatch(matchId: string): Promise<MvpVote[]> {
  const q = query(collection(db, 'mvpVotes'), where('matchId', '==', matchId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToVote(d.data()))
}

export async function getMyVote(matchId: string, voterId: string): Promise<MvpVote | null> {
  const id = voteId(matchId, voterId)
  const snap = await getDocs(query(collection(db, 'mvpVotes'), where('__name__', '==', id)))
  if (snap.empty) return null
  return docToVote(snap.docs[0].data())
}
