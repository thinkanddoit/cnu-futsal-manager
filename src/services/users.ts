import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { AppUser, UserRole } from '../types'

function docToUser(id: string, data: Record<string, any>): AppUser {
  return {
    uid: id,
    name: data.name,
    kakaoId: data.kakaoId,
    profileImage: data.profileImage,
    role: data.role as UserRole,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

export async function getPendingUsers(): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'pending'), orderBy('createdAt'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToUser(d.id, d.data()))
}

export async function getAllMembers(): Promise<AppUser[]> {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['member', 'admin']),
    orderBy('createdAt')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => docToUser(d.id, d.data()))
}

export async function approveUser(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role: 'member' })
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}
