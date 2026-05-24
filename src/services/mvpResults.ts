import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { MvpResult } from '../types'

export async function saveMvpResult(
  matchId: string,
  first: string[],
  second: string[],
  third: string[]
): Promise<void> {
  await addDoc(collection(db, 'mvpResults'), {
    matchId,
    first,
    second,
    third,
    createdAt: Timestamp.now(),
  })
}

export async function getMvpResult(matchId: string): Promise<MvpResult | null> {
  const q = query(collection(db, 'mvpResults'), where('matchId', '==', matchId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const data = snap.docs[0].data()
  return {
    matchId: data.matchId,
    first: data.first,
    second: data.second,
    third: data.third,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}
