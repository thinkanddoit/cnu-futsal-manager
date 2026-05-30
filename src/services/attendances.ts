import {
  doc,
  setDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Attendance, AttendanceStatus } from '../types'

function attendanceId(matchId: string, userId: string) {
  return `${matchId}_${userId}`
}

function docToAttendance(data: Record<string, any>): Attendance {
  return {
    matchId: data.matchId,
    userId: data.userId ?? null,
    status: data.status as AttendanceStatus,
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  }
}

export async function setAttendance(
  matchId: string,
  userId: string,
  status: AttendanceStatus
): Promise<void> {
  const id = attendanceId(matchId, userId)
  await setDoc(doc(db, 'attendances', id), {
    matchId,
    userId,
    status,
    updatedAt: Timestamp.now(),
  })
}

export async function getAttendancesForMatch(matchId: string): Promise<Attendance[]> {
  const q = query(collection(db, 'attendances'), where('matchId', '==', matchId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToAttendance(d.data()))
}

export function subscribeToMatchAttendances(
  matchId: string,
  onData: (attendances: Attendance[]) => void
): () => void {
  const q = query(collection(db, 'attendances'), where('matchId', '==', matchId))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => docToAttendance(d.data())))
  })
}

export async function getUserAttendances(userId: string): Promise<Attendance[]> {
  const q = query(collection(db, 'attendances'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToAttendance(d.data()))
}

export async function saveMatchAttendances(
  matchId: string,
  uids: string[]
): Promise<void> {
  const writes = uids.map((uid) =>
    setDoc(doc(db, 'attendances', attendanceId(matchId, uid)), {
      matchId,
      userId: uid,
      status: 'attending' as AttendanceStatus,
      updatedAt: Timestamp.now(),
    })
  )
  await Promise.all(writes)
}

export async function linkGuestAttendances(memberUid: string, guestUid: string): Promise<void> {
  const q = query(collection(db, 'attendances'), where('userId', '==', guestUid))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { userId: memberUid })))
}
