import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { Match, MatchStatus } from '../types'

function docToMatch(id: string, data: Record<string, any>): Match {
  return {
    id,
    date: data.date?.toDate() ?? new Date(),
    time: data.time ?? '',
    venue: data.venue,
    status: data.status as MatchStatus,
    confirmedAt: data.confirmedAt?.toDate() ?? null,
    voteDeadline: data.voteDeadline?.toDate() ?? null,
    voteTallied: data.voteTallied ?? false,
    createdBy: data.createdBy,
  }
}

export function subscribeToMatches(
  onData: (matches: Match[]) => void
): () => void {
  const q = query(collection(db, 'matches'), orderBy('date'))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => docToMatch(d.id, d.data())))
  })
}

export async function getMatchesByMonth(year: number, month: number): Promise<Match[]> {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const q = query(
    collection(db, 'matches'),
    where('date', '>=', Timestamp.fromDate(start)),
    where('date', '<', Timestamp.fromDate(end)),
    orderBy('date')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToMatch(d.id, d.data()))
}

export async function createMatch(
  date: Date,
  time: string,
  venue: string,
  createdBy: string,
  status: MatchStatus = 'voting'
): Promise<string> {
  const ref = await addDoc(collection(db, 'matches'), {
    date: Timestamp.fromDate(date),
    time,
    venue,
    status,
    confirmedAt: status === 'confirmed' ? Timestamp.now() : null,
    voteDeadline: null,
    voteTallied: false,
    createdBy,
  })
  return ref.id
}

export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus
): Promise<void> {
  const updates: Record<string, any> = { status }

  if (status === 'confirmed') {
    updates.confirmedAt = Timestamp.now()
  }

  if (status === 'completed') {
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + 24)
    updates.voteDeadline = Timestamp.fromDate(deadline)
    updates.voteTallied = false
  }

  await updateDoc(doc(db, 'matches', matchId), updates)
}

export function getNextMonthMondays(): Date[] {
  const now = new Date()
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const month = (now.getMonth() + 1) % 12

  const mondays: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  while (d.getMonth() === month) {
    mondays.push(new Date(d))
    d.setDate(d.getDate() + 7)
  }
  return mondays
}
