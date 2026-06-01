import {
  collection,
  doc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { auth } from '../firebase'
import { AppUser, UserRole } from '../types'

function docToUser(id: string, data: Record<string, any>): AppUser {
  return {
    uid: id,
    name: data.name,
    kakaoId: data.kakaoId,
    role: data.role as UserRole,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    nameConfirmed: data.nameConfirmed,
  }
}

export async function getPendingUsers(): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'pending'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToUser(d.id, d.data()))
}

export async function getAllMembers(): Promise<AppUser[]> {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['member', 'admin'])
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToUser(d.id, d.data()))
}

export async function getAllUsers(): Promise<AppUser[]> {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['member', 'admin', 'guest'])
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToUser(d.id, d.data()))
}

export async function getOrCreateGuestUser(name: string): Promise<string> {
  const q = query(collection(db, 'users'), where('name', '==', name), where('role', '==', 'guest'))
  const snap = await getDocs(q)
  if (!snap.empty) return snap.docs[0].id
  const ref = await addDoc(collection(db, 'users'), {
    name,
    role: 'guest',
    createdAt: Timestamp.now(),
  })
  return ref.id
}


export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { name, nameConfirmed: true })
}

export async function createMember(name: string): Promise<string> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('not_authenticated')

  const res = await fetch(`${serverUrl}/users/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ name }),
  })
  if (res.status === 403) throw new Error('forbidden')
  if (res.status === 409) throw new Error('duplicate_name')
  if (!res.ok) throw new Error('Failed to create member')
  const { uid } = (await res.json()) as { uid: string }
  return uid
}
