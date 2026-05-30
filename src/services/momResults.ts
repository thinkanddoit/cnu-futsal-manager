import { collection, setDoc, doc, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { MomResult } from '../types'

export async function saveMomResult(
  matchId: string,
  first: string[],
  second: string[],
  third: string[]
): Promise<void> {
  await setDoc(doc(db, 'mvpResults', matchId), {
    matchId,
    first,
    second,
    third,
    createdAt: Timestamp.now(),
  })
}

export async function getMomResult(matchId: string): Promise<MomResult | null> {
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
