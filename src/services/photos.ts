import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { MatchPhoto } from '../types'

function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = objectUrl
  })
}

export async function setMatchPhoto(
  matchId: string,
  userId: string,
  file: File
): Promise<MatchPhoto> {
  const dataUrl = await compressImage(file)
  await setDoc(doc(db, 'matchPhotos', matchId), {
    matchId,
    url: dataUrl,
    uploadedBy: userId,
    createdAt: Timestamp.now(),
  })
  return { id: matchId, matchId, url: dataUrl, uploadedBy: userId, createdAt: new Date() }
}

export async function getMatchPhoto(matchId: string): Promise<MatchPhoto | null> {
  const snap = await getDoc(doc(db, 'matchPhotos', matchId))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: snap.id,
    matchId: d.matchId,
    url: d.url,
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt?.toDate() ?? new Date(),
  }
}
