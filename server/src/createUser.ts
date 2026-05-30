import * as admin from 'firebase-admin'
import * as bcrypt from 'bcryptjs'

export async function createMemberUser(name: string): Promise<string> {
  const db = admin.firestore()
  const newUserRef = db.collection('users').doc()

  await newUserRef.set({
    name,
    role: 'member',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  const uid = newUserRef.id
  const passwordHash = await bcrypt.hash('1234', 10)
  await db.collection('userCredentials').doc(uid).set({ passwordHash })

  return uid
}
