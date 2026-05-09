import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  orderBy,
  query,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase'
import { UserStats } from '../types'

function defaultStats(userId: string): UserStats {
  return { userId, totalPoints: 0, attendanceCount: 0, mvp1st: 0, mvp2nd: 0, mvp3rd: 0 }
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const snap = await getDoc(doc(db, 'userStats', userId))
  if (!snap.exists()) return defaultStats(userId)
  return { userId, ...snap.data() } as UserStats
}

export async function getAllUserStats(): Promise<UserStats[]> {
  const snap = await getDocs(query(collection(db, 'userStats'), orderBy('totalPoints', 'desc')))
  return snap.docs.map((d) => ({ userId: d.id, ...d.data() } as UserStats))
}

export async function addAttendancePoint(userId: string): Promise<void> {
  const ref = doc(db, 'userStats', userId)
  await setDoc(
    ref,
    { totalPoints: increment(1), attendanceCount: increment(1) },
    { merge: true }
  )
}

export async function addMvpPoints(
  userId: string,
  rank: 1 | 2 | 3,
  points: number
): Promise<void> {
  const rankField = rank === 1 ? 'mvp1st' : rank === 2 ? 'mvp2nd' : 'mvp3rd'
  const ref = doc(db, 'userStats', userId)
  await setDoc(
    ref,
    { totalPoints: increment(points), [rankField]: increment(1) },
    { merge: true }
  )
}
