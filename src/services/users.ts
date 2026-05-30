import {
  collection,
  doc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { AppUser, UserRole } from '../types'
import { linkGuestAttendances } from './attendances'

function docToUser(id: string, data: Record<string, any>): AppUser {
  return {
    uid: id,
    name: data.name,
    kakaoId: data.kakaoId,
    role: data.role as UserRole,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    nameConfirmed: data.nameConfirmed ?? false,
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
    kakaoId: '',
    createdAt: Timestamp.now(),
    nameConfirmed: true,
  })
  return ref.id
}

export async function approveUser(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role: 'member' })
  const q = query(collection(db, 'users'), where('name', '==', name), where('role', '==', 'guest'))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(async (guestDoc) => {
    await linkGuestAttendances(uid, guestDoc.id)
    await deleteDoc(guestDoc.ref)
  }))
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { name, nameConfirmed: true })
}
