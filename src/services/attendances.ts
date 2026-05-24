import {
  doc,
  setDoc,
  addDoc,
  getDocs,
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
    userId: data.userId,
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

export interface AttendeeInput {
  userId: string | null
  guestName?: string
}

export async function saveMatchAttendances(
  matchId: string,
  attendees: AttendeeInput[]
): Promise<void> {
  const writes = attendees.map((a) => {
    const docData: Record<string, any> = {
      matchId,
      userId: a.userId,
      status: 'attending' as AttendanceStatus,
      updatedAt: Timestamp.now(),
    }
    if (a.guestName) docData.guestName = a.guestName

    if (a.userId) {
      return setDoc(doc(db, 'attendances', attendanceId(matchId, a.userId)), docData)
    } else {
      return addDoc(collection(db, 'attendances'), docData)
    }
  })
  await Promise.all(writes)
}
