import {
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
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
    const all = snap.docs.map((d) => docToAttendance(d.data()))
    // userId 중복 제거 (게스트→정회원 전환 시 중복 문서 방어)
    const seen = new Set<string>()
    const deduped = all.filter((a) => {
      if (!a.userId) return true
      if (seen.has(a.userId)) return false
      seen.add(a.userId)
      return true
    })
    onData(deduped)
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

// 게스트→정회원 전환 후 문서 ID와 userId가 불일치할 수 있어 쿼리로 실제 문서를 찾아 업데이트
// 중복 문서가 있으면 첫 번째만 업데이트하고 나머지는 삭제
export async function updateAttendanceStatus(
  matchId: string,
  userId: string,
  status: AttendanceStatus
): Promise<void> {
  const q = query(
    collection(db, 'attendances'),
    where('matchId', '==', matchId),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    const [primary, ...duplicates] = snap.docs
    await updateDoc(primary.ref, { status, updatedAt: Timestamp.now() })
    if (duplicates.length > 0) {
      await Promise.all(duplicates.map((d) => deleteDoc(d.ref)))
    }
  } else {
    await setAttendance(matchId, userId, status)
  }
}
